// File System Service
// This service provides utilities for managing and navigating file structures

/**
 * Helper function to generate a unique ID for file tree nodes
 * @returns {string} A unique ID
 */
const generateId = () => {
  return Math.random().toString(36).substring(2, 9);
};

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} The file extension
 */
const getFileExtension = (filename) => {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Determine if a file is a text file based on its extension
 * @param {string} filename - The filename
 * @returns {boolean} True if it's a text file
 */
const isTextFile = (filename) => {
  const textExtensions = [
    'txt', 'md', 'markdown', 'js', 'jsx', 'ts', 'tsx', 
    'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 
    'yaml', 'yml', 'py', 'rb', 'java', 'c', 'cpp', 'h', 
    'cs', 'php', 'go', 'rust', 'rs', 'swift', 'kt', 'sql',
    'gitignore', 'env', 'sh', 'bat', 'ps1', 'config'
  ];
  
  const extension = getFileExtension(filename);
  
  // Files without extension but common text file names
  const textFilenames = ['dockerfile', 'makefile', 'license', 'readme'];
  
  return textExtensions.includes(extension) || 
         textFilenames.includes(filename.toLowerCase());
};

/**
 * Get the appropriate icon for a file based on its extension or type
 * @param {string} filename - The filename
 * @param {boolean} isDirectory - Whether the item is a directory
 * @returns {string} Icon class name (assumes using Font Awesome or similar)
 */
const getFileIcon = (filename, isDirectory) => {
  if (isDirectory) {
    return 'fa-folder';
  }
  
  const extension = getFileExtension(filename);
  
  // Map extensions to icons
  const iconMap = {
    // Documents
    'pdf': 'fa-file-pdf',
    'doc': 'fa-file-word', 'docx': 'fa-file-word',
    'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel',
    'ppt': 'fa-file-powerpoint', 'pptx': 'fa-file-powerpoint',
    'txt': 'fa-file-alt',
    'md': 'fa-file-alt', 'markdown': 'fa-file-alt',
    
    // Code files
    'html': 'fa-html5',
    'css': 'fa-css3-alt',
    'js': 'fa-js', 'jsx': 'fa-js',
    'ts': 'fa-code', 'tsx': 'fa-code',
    'py': 'fa-python',
    'java': 'fa-java',
    'php': 'fa-php',
    'rb': 'fa-gem', // Ruby
    'go': 'fa-code',
    'rs': 'fa-code', // Rust
    'c': 'fa-code', 'cpp': 'fa-code', 'h': 'fa-code',
    'cs': 'fa-code', // C#
    
    // Config files
    'json': 'fa-code',
    'xml': 'fa-code',
    'yml': 'fa-cog', 'yaml': 'fa-cog',
    
    // Images
    'jpg': 'fa-file-image', 'jpeg': 'fa-file-image',
    'png': 'fa-file-image',
    'gif': 'fa-file-image',
    'svg': 'fa-file-image',
    
    // Archives
    'zip': 'fa-file-archive',
    'rar': 'fa-file-archive',
    'tar': 'fa-file-archive',
    'gz': 'fa-file-archive',
    
    // Other
    'gitignore': 'fa-git',
    'env': 'fa-key'
  };
  
  // Special filenames
  if (filename.toLowerCase() === 'license') return 'fa-gavel';
  if (filename.toLowerCase() === 'readme.md') return 'fa-book';
  if (filename.toLowerCase() === 'package.json') return 'fa-npm';
  
  return iconMap[extension] || 'fa-file';
};

/**
 * Determine if a file can be edited in the browser
 * @param {string} filename - The filename to check
 * @returns {boolean} Whether the file is editable
 */
const isFileEditable = (filename) => {
  return isTextFile(filename);
};

/**
 * Sorts files and directories in the file tree
 * Directories are listed first, followed by files, both sorted alphabetically
 * @param {Array} items - Array of file and directory objects
 * @returns {Array} - Sorted array
 */
const sortFileTree = (items) => {
  return items.sort((a, b) => {
    // If both are the same type (dir or file), sort alphabetically
    if ((a.type === 'dir' && b.type === 'dir') || (a.type !== 'dir' && b.type !== 'dir')) {
      return a.name.localeCompare(b.name);
    }
    // Otherwise, directories come first
    return a.type === 'dir' ? -1 : 1;
  });
};

/**
 * Process a flat list of files/directories from GitHub API into a hierarchical tree structure
 * @param {Array} files - Array of file/directory objects from GitHub API
 * @returns {Array} - Hierarchical file tree
 */
const processFileTree = (files) => {
  if (!Array.isArray(files)) {
    // If it's not an array (might be a single file), convert to array
    files = [files];
  }
  
  // Sort files and directories (directories first, then alphabetically)
  return files.sort((a, b) => {
    // Sort directories before files
    if (a.type === 'dir' && b.type !== 'dir') return -1;
    if (a.type !== 'dir' && b.type === 'dir') return 1;
    
    // Then sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
};

/**
 * Flattens a hierarchical file tree into a searchable array
 * @param {Array} tree - Hierarchical file tree
 * @returns {Array} - Flattened array of all files/directories
 */
const flattenFileTree = (tree) => {
  let result = [];
  
  for (const node of tree) {
    result.push(node);
    
    if (node.type === 'dir' && node.children) {
      result = result.concat(flattenFileTree(node.children));
    }
  }
  
  return result;
};

/**
 * Search files in the tree by name
 * @param {Array} tree - File tree or flattened file array 
 * @param {string} searchTerm - Term to search for
 * @returns {Array} - Search results
 */
const searchFiles = (tree, searchTerm) => {
  if (!searchTerm) return [];
  
  const flattenedTree = Array.isArray(tree[0]?.children) 
    ? flattenFileTree(tree) 
    : tree;
  
  return flattenedTree.filter(node => 
    node.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

/**
 * Find a node in the file tree by path
 * @param {Array} tree - File tree
 * @param {string} path - Path to find
 * @returns {Object|null} - Found node or null
 */
const findNodeByPath = (tree, path) => {
  if (!tree || !Array.isArray(tree)) {
    return null;
  }

  for (const node of tree) {
    if (node.path === path) {
      return node;
    }

    if (node.type === 'dir' && node.children && Array.isArray(node.children)) {
      const found = findNodeByPath(node.children, path);
      if (found) {
        return found;
      }
    }
  }

  return null;
};

/**
 * Toggle the expanded state of a directory in the file tree
 * @param {Array} tree - The file tree to modify
 * @param {string} path - The path of the directory to toggle
 * @returns {Array} The updated file tree
 */
const toggleDirectoryExpanded = (tree, path) => {
  return tree.map(node => {
    if (node.path === path && node.type === 'dir') {
      return { ...node, expanded: !node.expanded };
    }
    
    if (node.children && node.children.length > 0) {
      return { 
        ...node, 
        children: toggleDirectoryExpanded(node.children, path) 
      };
    }
    
    return node;
  });
};

/**
 * Get the syntax highlighting language based on file extension
 * @param {string} filename - The filename
 * @returns {string} The language for syntax highlighting
 */
const getSyntaxHighlightLanguage = (filename) => {
  const extension = getFileExtension(filename);
  
  const languageMap = {
    // JavaScript and related
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    
    // Web
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    
    // Data formats
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    
    // Other languages
    'py': 'python',
    'rb': 'ruby',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'cs': 'csharp',
    'php': 'php',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'sql': 'sql',
    
    // Markdown
    'md': 'markdown',
    'markdown': 'markdown',
    
    // Shell scripts
    'sh': 'bash',
    'bat': 'batch',
    'ps1': 'powershell'
  };
  
  return languageMap[extension] || 'plaintext';
};

/**
 * Determine the file type from filename
 * @param {string} filename - Name of the file
 * @returns {string} - File type identifier
 */
const getFileType = (filename) => {
  const extension = filename.split('.').pop().toLowerCase();
  
  // Map of extensions to file types
  const fileTypes = {
    // Code files
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    css: 'css',
    scss: 'css',
    py: 'python',
    java: 'java',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    swift: 'swift',
    
    // Data files
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    
    // Markdown and documentation
    md: 'markdown',
    txt: 'text',
    
    // Images
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    svg: 'svg',
    
    // Other
    pdf: 'pdf',
    zip: 'archive'
  };
  
  return fileTypes[extension] || 'unknown';
};

/**
 * Get an appropriate icon name for a file based on its type or name
 * @param {string} filename - Name of the file
 * @param {string} type - Type of node (file or dir)
 * @returns {string} - Icon name
 */
const getIconForFile = (filename, type) => {
  if (type === 'dir') {
    return 'folder';
  }
  
  // Check for special filenames
  const specialFiles = {
    'package.json': 'npm',
    'package-lock.json': 'npm',
    'npm-shrinkwrap.json': 'npm',
    '.npmrc': 'npm',
    'yarn.lock': 'yarn',
    '.yarnrc': 'yarn',
    'dockerfile': 'docker',
    '.dockerignore': 'docker',
    '.gitignore': 'git',
    '.gitattributes': 'git',
    'readme.md': 'book',
    'license': 'certificate',
    'license.md': 'certificate',
    'license.txt': 'certificate',
    '.env': 'key',
    '.env.local': 'key',
    '.env.development': 'key'
  };
  
  const lowercaseFilename = filename.toLowerCase();
  if (specialFiles[lowercaseFilename]) {
    return specialFiles[lowercaseFilename];
  }
  
  // Use file type to determine icon
  const fileType = getFileType(filename);
  const fileTypeIcons = {
    javascript: 'js',
    typescript: 'ts',
    python: 'python',
    html: 'html',
    css: 'css',
    json: 'json',
    markdown: 'markdown',
    image: 'image',
    document: 'document',
    archive: 'archive'
  };
  
  return fileTypeIcons[fileType] || 'file';
};

const fileSystemService = {
  getFileExtension,
  isTextFile,
  getFileIcon,
  isFileEditable,
  processFileTree,
  flattenFileTree,
  searchFiles,
  findNodeByPath,
  toggleDirectoryExpanded,
  getSyntaxHighlightLanguage,
  getFileType,
  getIconForFile
};

export default fileSystemService; 