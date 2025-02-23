const { exec } = require('child_process');
const os = require('os');
const chalk = require('chalk');
const qrcode = require('qrcode-terminal');

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIP = getLocalIP();
const clientURL = `http://${localIP}:3000`;

console.log(chalk.cyan('\n🚀 Starting P2P Chat Application...\n'));

// Start the server
const server = exec('cd server && npm start');
console.log(chalk.green('📡 Starting server...'));

server.stdout.on('data', (data) => {
    console.log(chalk.dim('Server:', data.trim()));
});

server.stderr.on('data', (data) => {
    console.error(chalk.red('Server Error:', data));
});

// Wait for server to start, then start the client
setTimeout(() => {
    console.log(chalk.green('\n💻 Starting client application...'));
    const client = exec('npm start');

    client.stdout.on('data', (data) => {
        console.log(chalk.dim('Client:', data.trim()));
    });

    client.stderr.on('data', (data) => {
        console.error(chalk.red('Client Error:', data));
    });

    // Display connection information
    setTimeout(() => {
        console.log(chalk.cyan('\n✨ P2P Chat is ready!\n'));
        console.log(chalk.yellow('📱 To connect from other devices on the same network:'));
        console.log(chalk.white(`   ${clientURL}\n`));
        
        console.log(chalk.yellow('🔍 Scan this QR code to open on your phone:'));
        qrcode.generate(clientURL, { small: true });
        
        console.log(chalk.gray('\n📝 Instructions:'));
        console.log(chalk.white(' 1. Open the above URL on another device'));
        console.log(chalk.white(' 2. Click "Copy ID" on one device'));
        console.log(chalk.white(' 3. Paste the ID in "Enter peer ID to connect" on the other device'));
        console.log(chalk.white(' 4. Start chatting!\n'));
        
        console.log(chalk.red('Press Ctrl+C to stop the application\n'));
    }, 5000);
}, 2000); 