const { v1: Uuidv1 } = require('uuid');
const JWT = require('../utils/jwtDecoder');
// const SFClient = require('../utils/sfmc-client');
const logger = require('../utils/logger');
const AWS = require('aws-sdk');
const https = require('https');
const FormData = require("form-data");

const ID = process.env.S3_ACCESS_KEY;
const SECRET = process.env.S3_SECRETE_KEY;


// The name of the bucket that you have created
const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const s3 = new AWS.S3({
  accessKeyId: ID,
  secretAccessKey: SECRET
});

// Setting up S3 upload parameters
const params = {
  Bucket: BUCKET_NAME,
  Key: process.env.S3_FILE_NAME, // File name you want to save as in S3
};

const s3download = function () {
  return new Promise((resolve, reject) => {
    s3.createBucket({
      Bucket: BUCKET_NAME        /* Put your bucket name */
    }, function () {
      s3.getObject(params, function (err, data) {
        if (err) {
          reject(err);
        } else {
          resolve(data.Body.toString('utf-8'));
        }
      });
    });
  });
}

const uploadFile = async (data) => {

  // Uploading files to the bucket
  params['Body'] = data;
  console.log("Data to upload: ", params);
  await s3.upload(params, function (err, data) {
    if (err) {
      throw err;
    }
  }).promise();
};

const uploadToS3 = function(){  
  s3download()
  .then(content => {
    if (process.env.UI_CONFIG_DATA) {
      let newContent = "";
      for (let i = 0; i < global.queue.length; i++) {
        newContent += "" + global.queue[i] + "\r\n";
      }
      let finalContent = content + newContent;
      uploadFile(finalContent);
    }
  })
  .catch(err => {
    console.log(err);
    logger.error(err);
  });
}

const startTimer = function(){
  console.log("Starting timer");
  global.timer = setTimeout(() => {
    uploadToS3();
  }, 5000);
}

const stopTimer = function(){
  console.log("Stopiing timer");
  if(global.timer){
    clearTimeout(global.timer)
  }
}
/**
 * The Journey Builder calls this method for each contact processed by the journey.
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.execute = async (req, res) => {
  // decode data
  const requestData = JWT(req.body);
  try {

    stopTimer();
    console.log("In execute API");
    console.log("INTEGRATION_TYPE: ", process.env.INTEGRATION_TYPE.toLowerCase())
    if (process.env.INTEGRATION_TYPE.toLowerCase() === 's3') {
      console.log("UI config data is: ", process.env.UI_CONFIG_DATA)
      if (process.env.UI_CONFIG_DATA) {
        console.log("UI config data is available");
        let uiConfigData = JSON.parse(process.env.UI_CONFIG_DATA);
        console.log("UI config data is: ", uiConfigData);
        let newContent = "\r\n" +
          "id: " + id + "\r\n";
        newContent += "SubscriberKey: " + requestData.inArguments[0].contactKey + "\r\n";
        for (let i = 0; i < uiConfigData.length; i++) {
          newContent += "" + uiConfigData[i].name + ": " + requestData.inArguments[0][uiConfigData[i].id] + "\r\n";
        }
        console.log("new content is "+newContent)
        queue1.push(newContent);
        startTimer();
      }

      res.status(200).send({
        status: 'ok',
      });
    }
    else if (process.env.INTEGRATION_TYPE.toLowerCase() === 'crm') {
      const getAccessToken = function () {
        const postData = new FormData();
        postData.append("username", process.env.CRM_USERNAME);
        postData.append("password", process.env.CRM_PASSWORD);
        postData.append("grant_type", "password");
        postData.append("client_id", process.env.CRM_CLIENT_ID);
        postData.append("client_secret", process.env.CRM_CLIENT_SECRETE);

        const options = {
          method: 'POST',
          headers: postData.getHeaders()
        };
        const url = process.env.CRM_DOMAIN+"/"+process.env.CRM_AUTH_ENDPOINT;
        console.log("In getAccessToken function")
        return new Promise((resolve, reject) => {
          const req = https.request(url, options, (tokenResponse) => {
            if (tokenResponse.statusCode < 200 || tokenResponse.statusCode > 299) {
              console.log("Token call failed with: ", tokenResponse.statusMessage)
              return reject(new Error("HTTP status code "+tokenResponse.statusCode))
            }
            console.log('statusCode:', tokenResponse.statusCode);
            console.log('headers:', tokenResponse.headers);

            const body = []
            tokenResponse.on('data', (chunk) => {
              body.push(chunk);
            });
            tokenResponse.on('end', () => {              
              console.log("Received token respose")
              const resString = Buffer.concat(body).toString();  
              resolve(resString)
            })
          });
          
          postData.pipe(req);

          req.on('error', (err) => {
            console.log("Token call failed: ",err)
            reject(err)
          });
        });
      }
      const postCRM = function () {
        let reqPayload = {};
        console.log("UI_CONFIG_DATA value is: ",process.env.UI_CONFIG_DATA)
        let uiConfigData = JSON.parse(process.env.UI_CONFIG_DATA);
        reqPayload["SubscriberKey__c"] = requestData.inArguments[0].contactKey;
        reqPayload["LastName"] = "Hardcoded value";
        for (let i = 0; i < uiConfigData.length; i++) {
          reqPayload[uiConfigData[i].id] = requestData.inArguments[0][uiConfigData[i].id];
        }
        const postData = JSON.stringify(reqPayload);

        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.CRM_ACCESS_TOKEN
          }
        };
        const url = process.env.CRM_DOMAIN+"/"+process.env.CRM_RESOURCE_ENDPOINT;
        return new Promise((resolve, reject) => {
          const req = https.request(url, options, (res) => {
            if (res.statusCode < 200 || res.statusCode > 299) {
              return reject(new Error(`HTTP status code ${res.statusCode}`))
            }

            const body = []
            res.on('data', (chunk) => {
              body.push(chunk);
            })
            res.on('end', () => {
              const resString = Buffer.concat(body).toString()
              resolve(resString)
            })
          });
          req.on('error', (err) => {
            reject(err)
          });

          req.write(postData)
          req.end()
        });
      }
      if (process.env.CRM_ACCESS_TOKEN) {
        postCRM().then(crmResp => {
          console.log("Post CRM response: ", crmResp)
          res.status(200).send({
            status: 'ok',
            ...crmResp
          });
        }).catch(crmError => {
          console.log("Error while CRM post call: ",crmError);
          res.status(500).send({
            status: 'Error while updating CRM',
          });
        });
      } else {
        console.log("No token found. Fetching token...");
        getAccessToken().then(tokenResp => {
          const tokenRespJson = JSON.parse(tokenResp)
          const accessToken = tokenRespJson['access_token'];
          process.env['CRM_ACCESS_TOKEN'] = accessToken;
          console.log("Env variable for access token is: ", process.env.CRM_ACCESS_TOKEN)
          postCRM().then(crmResp => {
            res.status(200).send({
              status: 'ok',
              ...crmResp
            });
          }).catch(crmError => {
            console.log("Error while CRM post call: ",crmError);
            res.status(500).send({
              status: 'Error while updating CRM',
            });
          });

        }).catch(err => {
          console.log("Error while gettin access token ",err);
          res.status(500).send({
            status: 'Error while fetching access token',
          });
        });
      }
    }
    else {
      res.status(500).send({
        status: 'No integration type configured',
      });
    }
  } catch (error) {
    console.log("Error is: ",error)
    logger.error(error);
  }

  // try {
  //   const id = Uuidv1();

  //   await SFClient.saveData(process.env.DATA_EXTENSION_EXTERNAL_KEY, [
  //     {
  //       keys: {
  //         Id: id,
  //         SubscriberKey: data.inArguments[0].contactKey,
  //       },
  //       values: {
  //         Dse_Config: data.inArguments[0].DropdownOptions,
  //         Suggestion_and_Insight: data.inArguments[0].Text,
  //         Product: data.inArguments[0].DropdownOptions1,
  //       },
  //     },
  //   ]);
  // } catch (error) {
  //   logger.error(error);
  // }

  // res.status(200).send({
  //   status: 'ok',
  // });
  // Enter copied or downloaded access ID and secret key here
};

/**
 * Endpoint that receives a notification when a user saves the journey.
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.save = async (req, res) => {
  res.status(200).send({
    status: 'ok',
  });
};

/**
 *  Endpoint that receives a notification when a user publishes the journey.
 * @param req
 * @param res
 */
exports.publish = (req, res) => {
  res.status(200).send({
    status: 'ok',
  });
};

/**
 * Endpoint that receives a notification when a user performs
 * some validation as part of the publishing process.
 * @param req
 * @param res
 */
exports.validate = (req, res) => {
  res.status(200).send({
    status: 'ok',
  });
};
