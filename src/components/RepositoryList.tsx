import React, { useState } from 'react';
import { useGitHubRepositories } from '../hooks/useGitHubRepositories';
import { GitHubRepository } from '../types/github';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setSelectedRepository } from '../store/slices/githubSlice';
import { selectTheme } from '../store/slices/uiSlice';

interface RepositoryCardProps {
  repository: GitHubRepository;
  isSelected: boolean;
  onSelect: (id: number) => void;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({ 
  repository, 
  isSelected, 
  onSelect 
}) => {
  return (
    <div 
      className={`repository-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(repository.id)}
    >
      <div className="repository-card-header">
        <h3 className="repository-name">{repository.name}</h3>
        {repository.private && <span className="private-badge">Private</span>}
      </div>
      
      <p className="repository-description">
        {repository.description || 'No description provided'}
      </p>
      
      <div className="repository-stats">
        <span className="stat">
          <i className="icon star" />
          {repository.stargazers_count}
        </span>
        <span className="stat">
          <i className="icon fork" />
          {repository.forks_count}
        </span>
        {repository.language && (
          <span className="language">
            <span 
              className="language-color" 
              style={{ backgroundColor: getLanguageColor(repository.language) }} 
            />
            {repository.language}
          </span>
        )}
      </div>
      
      <div className="repository-updated">
        Updated {new Date(repository.updated_at).toLocaleDateString()}
      </div>
    </div>
  );
};

interface CreateRepositoryFormProps {
  onCreate: (data: { name: string; description?: string; private?: boolean }) => void;
  isCreating: boolean;
}

const CreateRepositoryForm: React.FC<CreateRepositoryFormProps> = ({ 
  onCreate, 
  isCreating 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    onCreate({
      name,
      description: description || undefined,
      private: isPrivate,
    });
    
    // Reset form
    setName('');
    setDescription('');
    setIsPrivate(false);
  };
  
  return (
    <form className="create-repository-form" onSubmit={handleSubmit}>
      <h2>Create New Repository</h2>
      
      <div className="form-field">
        <label htmlFor="repo-name">Repository Name*</label>
        <input
          id="repo-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="my-new-repo"
        />
      </div>
      
      <div className="form-field">
        <label htmlFor="repo-description">Description</label>
        <textarea
          id="repo-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={3}
        />
      </div>
      
      <div className="form-field checkbox">
        <input
          id="repo-private"
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
        />
        <label htmlFor="repo-private">Private Repository</label>
      </div>
      
      <button 
        type="submit" 
        disabled={!name.trim() || isCreating}
        className="create-button"
      >
        {isCreating ? 'Creating...' : 'Create Repository'}
      </button>
    </form>
  );
};

// Define type for hook result to fix TypeScript errors
type GitHubRepositoriesHookResult = {
  repositories: GitHubRepository[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  createRepository: (data: { name: string; description?: string; private?: boolean }) => void;
  isCreating: boolean;
};

const RepositoryList: React.FC = () => {
  const dispatch = useAppDispatch();
  // Cast the hook result to the proper type
  const { 
    repositories, 
    isLoading, 
    isError, 
    error, 
    refetch, 
    createRepository, 
    isCreating 
  } = useGitHubRepositories() as GitHubRepositoriesHookResult;
  const selectedRepositoryId = useAppSelector(state => state.github.selectedRepository);
  const theme = useAppSelector(selectTheme);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const handleRepositorySelect = (id: number) => {
    dispatch(setSelectedRepository(id));
  };
  
  const handleCreateRepository = (data: { 
    name: string; 
    description?: string; 
    private?: boolean 
  }) => {
    createRepository(data);
    setShowCreateForm(false);
  };
  
  if (isLoading) {
    return <div className="loading-repositories">Loading repositories...</div>;
  }
  
  if (isError) {
    return (
      <div className="repositories-error">
        <p>Error loading repositories: {error?.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }
  
  return (
    <div className={`repository-list-container ${theme}`}>
      <div className="repository-list-header">
        <h2>Your Repositories</h2>
        <button 
          className="new-repository-button"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'New Repository'}
        </button>
      </div>
      
      {showCreateForm && (
        <CreateRepositoryForm 
          onCreate={handleCreateRepository} 
          isCreating={isCreating} 
        />
      )}
      
      <div className="repository-list">
        {Array.isArray(repositories) && repositories.length > 0 ? (
          repositories.map((repo: GitHubRepository) => (
            <RepositoryCard
              key={repo.id}
              repository={repo}
              isSelected={selectedRepositoryId === repo.id}
              onSelect={handleRepositorySelect}
            />
          ))
        ) : (
          <div className="no-repositories">
            <p>No repositories found</p>
            <button 
              className="create-first-repo-button"
              onClick={() => setShowCreateForm(true)}
            >
              Create your first repository
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get a color for a programming language
const getLanguageColor = (language: string): string => {
  const colors: Record<string, string> = {
    JavaScript: '#f1e05a',
    TypeScript: '#2b7489',
    Python: '#3572A5',
    Java: '#b07219',
    HTML: '#e34c26',
    CSS: '#563d7c',
    C: '#555555',
    'C++': '#f34b7d',
    'C#': '#178600',
    Ruby: '#701516',
    Go: '#00ADD8',
    Swift: '#ffac45',
    Kotlin: '#F18E33',
    Rust: '#dea584',
    PHP: '#4F5D95',
  };
  
  return colors[language] || '#bbbbbb';
};

export default RepositoryList; 