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

  https.get({url:UI_CONFIG_URL,json: true},(res) => {
    let body = "";

    res.on("data", (chunk) => {
        body += chunk;
    });

    res.on("end", () => {
        try {
            console.log('S3 response is ',body.replace(/\r?\n|\r/g, " "));
            let uiConfig = JSON.parse(body.replace(/\r?\n|\r/g, " "));
            // do something with JSON
            //console.log('UI json is ',JSON.stringify(uiConfig));

            res.render('index', {
              title: 'Custom Activity',
              uiConfig: uiConfig,
              dropdownOptions: [
                {
                  name: 'ABC',
                  value: 'ABC',
                },
                {
                  name: 'DEF',
                  value: 'DEF',
                },
                {
                  name: 'GHI',
                  value: 'GHI',
                },
              ],
              dropdownOptions1: [
                {
                  name: 'ABC',
                  value: 'ABC',
                },
                {
                  name: 'DEF',
                  value: 'DEF',
                },
                {
                  name: 'GHI',
                  value: 'GHI',
                },
              ],
             
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
