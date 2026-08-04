@echo off
chcp 65001 > nul
echo Adwaa Travel Panel başlatılıyor...
echo.
node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');
const port = 3000;

const server = http.createServer((req, res) => {
  let file = req.url === '/' ? 'index.html' : req.url;
  let filepath = path.join(__dirname, file);
  
  if (fs.existsSync(filepath) && filepath.startsWith(__dirname)) {
    const ext = path.extname(filepath);
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.txt': 'text/plain' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filepath));
  } else {
    res.writeHead(404);
    res.end('Bulunamadı');
  }
});

server.listen(port, '0.0.0.0', () => {
  const os = require('os');
  const ips = Object.values(os.networkInterfaces()).flat().filter(x => x.family === 'IPv4' && !x.internal).map(x => x.address);
  console.log('🚀 Adwaa Travel Panel çalışıyor:');
  console.log('   Bu bilgisayarda: http://localhost:3000');
  ips.forEach(ip => console.log('   Ağdan:           http://' + ip + ':3000'));
  console.log('Sunucuyu durdurmak için pencereyi kapatın.');
});
"
pause