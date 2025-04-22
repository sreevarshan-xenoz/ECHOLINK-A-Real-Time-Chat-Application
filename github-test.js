const axios = require('axios');
require('dotenv').config();

// For security, we're not printing the full client secret
console.log('GitHub Client ID:', process.env.REACT_APP_GITHUB_CLIENT_ID);
console.log('GitHub Client Secret available:', !!process.env.REACT_APP_GITHUB_CLIENT_SECRET);

// Check if the GitHub OAuth app is properly registered
async function validateGitHubApp() {
  try {
    // We just check if the authorize URL for our client ID returns a 200 status
    const response = await axios.get(`https://github.com/login/oauth/authorize?client_id=${process.env.REACT_APP_GITHUB_CLIENT_ID}&scope=repo,user`, {
      maxRedirects: 0,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept redirect status codes
      }
    });
    
    console.log('GitHub OAuth App is valid. Status:', response.status);
    return true;
  } catch (error) {
    if (error.response && error.response.status === 302) {
      // 302 redirect is actually expected and good
      console.log('GitHub OAuth App is valid (got expected redirect)');
      return true;
    }
    console.error('Error validating GitHub OAuth app:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

validateGitHubApp(); 