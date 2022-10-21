const express = require('express');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');
const http = require('http');
const fs = require('fs');
const axios = require('axios');
const openwebApi = require('./services/axios');
const Devices = require('./devices/devices');


const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);

let configFile = null;
const devices = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const axiosTest = axios.create({
  baseURL: 'http://localhost/api/v1/trend',
  timeout: 1000,
  headers: {
    api_key: 'LDrRe68VqA2nIgeDdexLWQM0GslZiuTTHI6uIyaLjBjGPlptQnCJoYr4FY3J902A',
  },
});

// openwebApi.config.headers.api_key = "LDrRe68VqA2nIgeDdexLWQM0GslZiuTTHI6uIyaLjBjGPlptQnCJoYr4FY3J902A";

fs.readFile('settings.json', (err, data) => {
  try {
    configFile = JSON.parse(data);
    openwebApi.config.headers.api_key = configFile.openweb.api_key;
    console.log(configFile);
  } catch (err) {
    console.log(err);
  }
});

const getDataTest = async () => {
    await axiosTest
      .get('/devices')
      .then((response) => {
        // devices.push(response.data[0]);
        console.log(response.data);
        const {data} = response;
        data.map((element) => {
          if(!devices.find((item) => item.id === element.id)) {
            devices.push([ { device : new Devices(response.data[0].type, response.data[0].id, response.data[0].name) } ],
            );
            console.log(devices[0][0].device.id);
            getDatapointsFromDevice(devices[0][0].device.id);
          }
        });
        
        // getDatapointsFromDevice(response.data[0].id);
      })
      .catch((error) => {
        console.log(error.response.statusText);
      });
}

const getDatapointsFromDevice = async (deviceId) => {
  await axiosTest
    .get(`/devices/${deviceId}/datapoints`)
    .then((response) => {
      
      const datapoints = [];
      datapoints.push({ datapoints: response.data});
      // devices[0].push(datapoints);
      const id = devices.findIndex((element) => element.find((el) => el.device.id === deviceId));
      console.log(id);
      devices[id].push( ...datapoints );
      // datapoints.forEach((element) => {
      //   console.log(element);

      // })
      // getSingleDatapoint(response.data[0].id);
    })
    .catch((error) => {
      console.log(error.response.status);
    });
};

function getYesterdayDate() {
  return new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
}

const getSingleDatapoint = async (datapointId) => {
          const from = getYesterdayDate().toISOString();
          console.log(from);
  await axiosTest
    .get(
      `http://localhost/api/v1/trend/datapoints/${datapointId}/data?from=${from}&limit=1000`
    )
    .then((response) => {
      console.log(response.data.samples[response.data.samples.length-1].v);
    })
    .catch((error) => {
      console.log(error.response);
    });
};

const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
  },
});
io.on('connection', (socket) => {
  console.log('client connected: ', socket.id);
  socket.join('clock-room');

  socket.on('disconnect', (reason) => {
    console.log(reason);
  });
});

server.listen(PORT, (err) => {
  if (err) {
    console.log(err);
  }
  console.log('Server running on Port: ', PORT);
});

app.get('/test', (req, res) => {
    getDataTest();
    res.sendStatus(200);
})

app.get('/data', (req, res) => {
  
  res.send(devices);
});


app.post('/credentials', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  console.log(`Neuer API_KEY vom OPENweb wird ausgegeben: ${req.body.api_key}`);
  console.log(req.body.telegram.users);
  if (req.body.openweb.api_key) {
    res.sendStatus(200);
    // writeSettings(req.body.telegram.token, req.body.telegram.users, req.body.openweb.api_key);
  } else {
    res.sendStatus(400);
  }
});
