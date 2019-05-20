const express = require('express');
const multer = require('multer');
const crypto = require('crypto');

const { connectToDB } = require('./lib/mongo');
const { getImageInfoById, saveImageInfo } = require('./models/image');

const app = express();
const port = process.env.PORT || 8000;

const imageTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png'
};
const upload = multer({
  storage: multer.diskStorage({
    destination: `${__dirname}/uploads`,
    filename: (req, file, callback) => {
      const basename = crypto.pseudoRandomBytes(16).toString('hex');
      const extension = imageTypes[file.mimetype];
      callback(null, `${basename}.${extension}`);
    }
  }),
  fileFilter: (req, file, callback) => {
    callback(null, !!imageTypes[file.mimetype])
  }
});

app.get('/', (req, res, next) => {
  res.status(200).sendFile(__dirname + '/index.html');
});

app.post('/images', upload.single('image'), async (req, res, next) => {
  console.log("== req.file:", req.file);
  console.log("== req.body:", req.body);
  if (req.file && req.body && req.body.userId) {
    try {
      const image = {
        path: req.file.path,
        filename: req.file.filename,
        contentType: req.file.mimetype,
        userId: req.body.userId
      };
      const id = await saveImageInfo(image);
      res.status(200).send({ id: id });
    } catch (err) {
      next(err);
    }
  } else {
    res.status(400).send({
      err: "Request body was invalid."
    });
  }
});

app.get('/images/:id', async (req, res, next) => {
  try {
    const image = await getImageInfoById(req.params.id);
    if (image) {
      delete image.path;
      image.url = `/media/images/${image.filename}`;
      res.status(200).send(image);
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

app.use('/media/images', express.static(`${__dirname}/uploads`));

app.use('*', (err, req, res, next) => {
  console.error(err);
  res.status(500).send({
    err: "An error occurred.  Try again later."
  });
});

app.use('*', (req, res, next) => {
  res.status(404).send({
    err: "Path " + req.originalUrl + " does not exist"
  });
});

connectToDB(() => {
  app.listen(port, () => {
    console.log("== Server is running on port", port);
  });
});
