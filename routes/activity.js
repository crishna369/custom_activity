const { v1: Uuidv1 } = require('uuid');
const JWT = require('../utils/jwtDecoder');
// const SFClient = require('../utils/sfmc-client');
const logger = require('../utils/logger');
const AWS = require('aws-sdk');

/**
 * The Journey Builder calls this method for each contact processed by the journey.
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
exports.execute = async (req, res) => {
  // decode data
   const requestData = JWT(req.body);

  // console.log(data);

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


  const ID = process.env.S3_ACCESS_KEY;
  const SECRET = process.env.S3_SECRETE_KEY;

  
  // The name of the bucket that you have created
  const BUCKET_NAME = 'sfdc-widget';
  const s3 = new AWS.S3({
    accessKeyId: ID,
    secretAccessKey: SECRET
  });

  
    // Setting up S3 upload parameters
    const params = {
      Bucket: BUCKET_NAME,
      Key: 'journey_data.txt', // File name you want to save as in S3
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
                    console.log("Successfully dowloaded data from  bucket");
                    resolve(data);
                }
            });
        });
    });
}

  const uploadFile = (data) => {
    
    // Uploading files to the bucket
    params['Body'] = data;
    console.log("Final content is ",data);
    s3.upload(params, function(err, data) {
        if (err) {
            throw err;
        }
        console.log(`File uploaded successfully. ${data.Location}`);
    });
};

try {
  s3download()
    .then(content => {
      console.log("Old content is ",content);
      const id = Uuidv1();

      const newContent = "\r\n"+
      "id: "+id+"\r\n"+
      "SubscriberKey: "+requestData.inArguments[0].contactKey+"\r\n"+
      "Dse_Config: "+requestData.inArguments[0].DropdownOptions+"\r\n"+
      "Suggestion_and_Insight: "+requestData.inArguments[0].Text+"\r\n"+
      "Product: "+requestData.inArguments[0].DropdownOptions1+"\r\n";
      
      console.log("New content is ",newContent);
    
      let finalContent = content+newContent
      uploadFile(finalContent)
    })
    .catch(err => {
      logger.error(err);
    })
}catch (error) {
    logger.error(error);
  }
  res.status(200).send({
    status: 'ok',
  });
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
