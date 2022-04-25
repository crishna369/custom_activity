const path = require('path');
const fs = require('fs');
const https = require('https');

/**
 * Render Config
 * @param req
 * @param res
 */
exports.config = (req, res) => {
  const domain = req.headers.host || req.headers.origin;
  const file = path.join(__dirname, '..', 'public', 'config-template.json');

  const configTemplate = fs.readFileSync(file, 'utf-8');
  const config = JSON.parse(configTemplate.replace(/\$DOMAIN/g, domain));
  res.json(config);
};

/**
 * Render UI
 * @param req
 * @param res
 */
exports.ui = (req, res) => {
  
  const UI_CONFIG_URL = process.env.UI_CONFIG_URL;

  https.get(UI_CONFIG_URL,(response) => {
    let body = "";

    response.on("data", (chunk) => {
        body += chunk;
    });

    response.on("end", () => {
        try {
            let uiConfig = JSON.parse(body);
            // do something with JSON
            process.env['UI_CONFIG_DATA'] = JSON.stringify(uiConfig);
            res.render('index', {
              title: 'Custom Activity',
              uiConfig: uiConfig             
            });

        } catch (error) {
            console.error(error.message);
        };
    });

  }).on("error", (error) => {
      console.error(error.message);
  });
  


  // res.render('index', {
  //   title: 'Custom Activity',
  //   dropdownOptions: [
  //     {
  //       name: 'ABC',
  //       value: 'ABC',
  //     },
  //     {
  //       name: 'DEF',
  //       value: 'DEF',
  //     },
  //     {
  //       name: 'GHI',
  //       value: 'GHI',
  //     },
  //   ],
  //   dropdownOptions1: [
  //     {
  //       name: 'ABC',
  //       value: 'ABC',
  //     },
  //     {
  //       name: 'DEF',
  //       value: 'DEF',
  //     },
  //     {
  //       name: 'GHI',
  //       value: 'GHI',
  //     },
  //   ],
   
  // });
};
