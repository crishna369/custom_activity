const { v1: Uuidv1 } = require('uuid');
// const JWT = require('../utils/jwtDecoder');
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
  // const data = JWT(req.body);

  // logger.info(data);

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

  logger.info(req.body);

  const ID = process.env.S3_ACCESS_KEY;
  const SECRET = process.env.S3_SECRETE_KEY;

  
  // The name of the bucket that you have created
  const BUCKET_NAME = 'sfdc-widget';
  const s3 = new AWS.S3({
    accessKeyId: ID,
    secretAccessKey: SECRET
  });

  const uploadFile = (fileContent) => {
    // Read content from the file
    //const fileContent = fs.readFileSync(fileName);

    // Setting up S3 upload parameters
    const params = {
        Bucket: BUCKET_NAME,
        Key: 'journey_data.txt', // File name you want to save as in S3
        Body: fileContent
    };

    // Uploading files to the bucket
    s3.upload(params, function(err, data) {
        if (err) {
            throw err;
        }
        console.log(`File uploaded successfully. ${data.Location}`);
    });
};

try {
  uploadFile(req.body);
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
