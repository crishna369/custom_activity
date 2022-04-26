const { v1: Uuidv1 } = require('uuid');
const JWT = require('../utils/jwtDecoder');
// const SFClient = require('../utils/sfmc-client');
const logger = require('../utils/logger');
const AWS = require('aws-sdk');
const https = require('https');

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
    console.log("In execute API");
    console.log("INTEGRATION_TYPE: ", process.env.INTEGRATION_TYPE.toLowerCase())
    if (process.env.INTEGRATION_TYPE.toLowerCase() === 's3') {
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

      const s3download = function (params) {
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

      await s3download(params)
        .then(content => {
          const id = Uuidv1();
          if (process.env.UI_CONFIG_DATA) {
            let uiConfigData = JSON.parse(process.env.UI_CONFIG_DATA);
            let newContent = "\r\n" +
              "id: " + id + "\r\n";
            newContent += "SubscriberKey: " + requestData.inArguments[0].contactKey + "\r\n";
            for (let i = 0; i < uiConfigData.length; i++) {
              newContent += "" + uiConfigData[i].name + ": " + requestData.inArguments[0][uiConfigData[i].id] + "\r\n";
            }
            let finalContent = content + newContent;
            uploadFile(finalContent);
          }
        })
        .catch(err => {
          console.log(err);
          logger.error(err);
        });

      res.status(200).send({
        status: 'ok',
      });
    }
    else if (process.env.INTEGRATION_TYPE.toLowerCase() === 'crm') {
      const getAccessToken = function () {
        const postData = JSON.stringify({
          "username": process.env.CRM_USERNAME,
          "password": process.env.CRM_PASSWORD,
          "grant_type": "password",
          "client_id": process.env.CRM_CLIENT_ID,
          "client_secret": process.env.CRM_CLIENT_SECRETE
        });
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
            'Content-Length': postData.length
          }
        };
        const url = process.env.CRM_DOMAIN+"/"+process.env.CRM_AUTH_ENDPOINT;
        console.log("In getAccessToken function")
        return new Promise((resolve, reject) => {
          const req = https.request(url, options, (tokenResponse) => {
            if (tokenResponse.statusCode < 200 || tokenResponse.statusCode > 299) {
              console.log("Token call failed with: ", tokenResponse.statusCode)
              return reject(new Error("HTTP status code "+tokenResponse.statusCode))
            }
            console.log('statusCode:', tokenResponse.statusCode);
            console.log('headers:', tokenResponse.headers);

            const body = []
            tokenResponse.on('data', (chunk) => {
              console.log("Receiving token respose... ",chunk)
              body.push(chunk);
            });
            tokenResponse.on('end', () => {              
              console.log("Received token respose")
              const resString = Buffer.concat(body).toString();         
              console.log("Token respose is ",resString)
              resolve(resString)
            })
          });

          req.on('error', (err) => {
            console.log("Token call failed: ",err)
            reject(err)
          });

          req.write(postData)
          req.end()
        });
      }
      const postCRM = function () {
        let reqPayload = {};
        let uiConfigData = JSON.parse(process.env.UI_CONFIG_DATA);
        reqPayload["SubscriberKey__c"] = requestData.inArguments[0].contactKey;
        reqPayload["LastName"] = "Hardcoded value";
        for (let i = 0; i < uiConfigData.length; i++) {
          reqPayload[uiConfigData[i].id] = requestData.inArguments[0][uiConfigData[i].id];
        }
        console.log("Request payload for post is ",reqPayload)
        const postData = JSON.stringify(reqPayload);

        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length,
            'Authorization': 'Bearer ' + process.env.CRM_ACCESS_TOKEN
          }
        };
        const url = process.env.CRM_DOMAIN+"/"+process.env.CRM_RESOURCE_ENDPOINT;
        return new Promise((resolve, reject) => {
          const req = https.request(url, options, (res) => {
            if (res.statusCode < 200 || res.statusCode > 299) {
              return reject(new Error(`HTTP status code ${res.statusCode}`))
            }
            console.log('statusCode:', res.statusCode);
            console.log('headers:', res.headers);

            const body = []
            res.on('data', (chunk) => body.push(chunk))
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
          console.log('Token response is ', JSON.parse(tokenResp));
          process.env['CRM_ACCESS_TOKEN'] = JSON.parse(tokenResp)['access_token'];
          postCRM().then(crmResp => {
            res.status(200).send({
              status: 'ok',
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
