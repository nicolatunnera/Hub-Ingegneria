#!/usr/bin/env node

/**
 * Engineering Cloud Hub - Web-based Firebase Rules Deployer
 * Run: node deploy-web.js
 * Access via: http://localhost:3000
 */

const http = require('http');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const html = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Firebase Rules Deployer - Hub Ingegneria</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 500px;
            width: 100%;
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            text-align: center;
            font-size: 28px;
        }
        
        .subtitle {
            color: #666;
            text-align: center;
            margin-bottom: 30px;
            font-size: 14px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            color: #333;
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }
        
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .status {
            margin-top: 20px;
            padding: 16px;
            border-radius: 8px;
            text-align: center;
            display: none;
            font-size: 14px;
        }
        
        .status.loading {
            background: #e3f2fd;
            color: #1976d2;
            display: block;
        }
        
        .status.success {
            background: #e8f5e9;
            color: #388e3c;
            display: block;
        }
        
        .status.error {
            background: #ffebee;
            color: #c62828;
            display: block;
        }
        
        .info-box {
            background: #f5f5f5;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 13px;
            color: #555;
            border-left: 4px solid #667eea;
        }
        
        .info-box strong {
            color: #333;
        }
        
        .step {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
        }
        
        .step-number {
            background: #667eea;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 12px;
            font-size: 12px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Firebase Rules Deployer</h1>
        <p class="subtitle">Hub Ingegneria v3.6.0</p>
        
        <div class="info-box">
            <div class="step">
                <div class="step-number">1</div>
                <div><strong>Inserisci Project ID</strong> (es: hub-ingegneria)</div>
            </div>
            <div class="step">
                <div class="step-number">2</div>
                <div><strong>Clicca Deploy</strong> e fai login Firebase</div>
            </div>
            <div class="step">
                <div class="step-number">3</div>
                <div><strong>Fatto!</strong> Rules aggiornate</div>
            </div>
        </div>
        
        <form id="deployForm">
            <div class="form-group">
                <label for="projectId">Firebase Project ID</label>
                <input 
                    type="text" 
                    id="projectId" 
                    placeholder="hub-ingegneria"
                    required
                >
            </div>
            
            <button type="submit" id="deployBtn">
                🚀 Deploy Rules
            </button>
            
            <div class="status" id="status"></div>
        </form>
    </div>
    
    <script>
        const form = document.getElementById('deployForm');
        const projectInput = document.getElementById('projectId');
        const deployBtn = document.getElementById('deployBtn');
        const status = document.getElementById('status');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const projectId = projectInput.value.trim();
            
            if (!projectId) {
                showStatus('❌ Inserisci Project ID', 'error');
                return;
            }
            
            deployBtn.disabled = true;
            showStatus('⏳ Deploy in corso...', 'loading');
            
            try {
                const response = await fetch('/deploy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ projectId })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showStatus('✅ Deploy completato! Rules aggiornate.', 'success');
                    projectInput.value = '';
                } else {
                    showStatus('❌ ' + (data.error || 'Deploy fallito'), 'error');
                }
            } catch (error) {
                showStatus('❌ Errore: ' + error.message, 'error');
            } finally {
                deployBtn.disabled = false;
            }
        });
        
        function showStatus(message, type) {
            status.textContent = message;
            status.className = 'status ' + type;
        }
    </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.url === '/' && req.method === 'GET') {
        res.writeHead(200);
        res.end(html);
    } else if (req.url === '/deploy' && req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const { projectId } = JSON.parse(body);
                
                if (!projectId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Project ID mancante' }));
                    return;
                }
                
                // Run firebase deploy
                exec(\`firebase deploy --only firestore:rules --project \${projectId}\`, 
                    (error, stdout, stderr) => {
                        res.writeHead(error ? 400 : 200, { 'Content-Type': 'application/json' });
                        
                        if (error) {
                            res.end(JSON.stringify({ 
                                error: 'Deploy fallito. Assicurati di aver fatto "firebase login"' 
                            }));
                        } else {
                            res.end(JSON.stringify({ 
                                success: true,
                                message: 'Rules deployate con successo!'
                            }));
                        }
                    }
                );
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'JSON non valido' }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   Firebase Rules Deployer - Hub Ingegneria  ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log('');
    console.log('🌐 Apri il browser: http://localhost:3000');
    console.log('');
    console.log('📋 Step:');
    console.log('   1. Accedi con "firebase login"');
    console.log('   2. Apri http://localhost:3000');
    console.log('   3. Inserisci Project ID');
    console.log('   4. Clicca Deploy!');
    console.log('');
});
