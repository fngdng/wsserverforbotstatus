import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';

const app = express();
const port = 3000;
let data = JSON.parse(fs.readFileSync('./data/status.json', 'utf8'));

app.use(express.static('public'));

const wss = new WebSocketServer({ noServer: true });

function updateBotStatus(botid, author, active) {
  let bot = data.find(x => x.botid === botid);
  if (bot) {
    bot.active = active;
  } else {
    bot = { botid, author, active };
    data.push(bot);
  }

  if (bot.author == null) {
    data = data.filter(function (el) {
      return el.author != null;
    });
  }
  fs.writeFileSync('./data/status.json', JSON.stringify(data, null, 2));

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const c = JSON.parse(message);
    ws.botid = c.botid;
    updateBotStatus(c.botid, c.author, true);
    console.log(message)
  });

  ws.on('close', () => {
    updateBotStatus(ws.botid, null, false);
  });
});

const server = app.listen(port, () => {
  console.log(`HTTP server listening on port ${port}`);
});

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Endpoint to serve JSON data
app.get('/status', (req, res) => {
  res.json(data);
});
