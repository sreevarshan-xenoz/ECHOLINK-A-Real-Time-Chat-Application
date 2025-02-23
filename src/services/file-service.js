class FileService {
    constructor() {
        this.storage = window.localStorage;
        this.FILES_KEY = 'p2p_chat_files';
        this.initializeStorage();
    }

    initializeStorage() {
        if (!this.storage.getItem(this.FILES_KEY)) {
            this.storage.setItem(this.FILES_KEY, JSON.stringify({}));
        }
    }

    async uploadFile(file) {
        try {
            const reader = new FileReader();
            
            return new Promise((resolve, reject) => {
                reader.onload = () => {
                    const fileId = `file_${Date.now()}_${file.name}`;
                    const fileData = {
                        id: fileId,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: reader.result,
                        timestamp: Date.now()
                    };

                    // Store file data
                    const files = JSON.parse(this.storage.getItem(this.FILES_KEY));
                    files[fileId] = fileData;
                    this.storage.setItem(this.FILES_KEY, JSON.stringify(files));

                    resolve({
                        id: fileId,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        url: reader.result
                    });
                };

                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            throw error;
        }
    }

    async downloadFile(fileId) {
        try {
            const files = JSON.parse(this.storage.getItem(this.FILES_KEY));
            const fileData = files[fileId];

            if (!fileData) {
                throw new Error('File not found');
            }

            // Create download link
            const a = document.createElement('a');
            a.href = fileData.data;
            a.download = fileData.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            return true;
        } catch (error) {
            console.error('Error downloading file:', error);
            throw error;
        }
    }

    getFile(fileId) {
        const files = JSON.parse(this.storage.getItem(this.FILES_KEY));
        return files[fileId] || null;
    }

    getAllFiles() {
        const files = JSON.parse(this.storage.getItem(this.FILES_KEY));
        return Object.values(files).map(file => ({
            id: file.id,
            name: file.name,
            type: file.type,
            size: file.size,
            timestamp: file.timestamp
        }));
    }

    deleteFile(fileId) {
        try {
            const files = JSON.parse(this.storage.getItem(this.FILES_KEY));
            delete files[fileId];
            this.storage.setItem(this.FILES_KEY, JSON.stringify(files));
            return true;
        } catch (error) {
            console.error('Error deleting file:', error);
            return false;
        }
    }

    clearFiles() {
        this.storage.setItem(this.FILES_KEY, JSON.stringify({}));
    }
}

export const fileService = new FileService(); 