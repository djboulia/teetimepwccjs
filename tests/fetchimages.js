/* by Kindacode.com */
const fs = require('fs');
const path = require('path');
const axios = require('axios').default;

// fileUrl: the absolute url of the image or video you want to download
// downloadFolder: the path of the downloaded file on your machine
const downloadFile = async (fileUrl, downloadFolder) => {
  // Get the file name
  const fileName = path.basename(fileUrl);

  // The path of the downloaded file on our machine
  const localFilePath = path.resolve(__dirname, downloadFolder, fileName);
  try {
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream',
    });

    const w = response.data.pipe(fs.createWriteStream(localFilePath));
    w.on('finish', () => {
      console.log('Successfully downloaded file!');
    });
  } catch (err) {
    console.log('could not find file ' + fileName);
    // throw new Error(err);
  }
}; 

// Testing
const IMAGE_URL =
  'https://ftapp.prestonwood.com/v5/images/temp/tmp13T700C';

for (let i=0; i<100; i++) {
    const url = IMAGE_URL + i + '.png';
    try {
        downloadFile(url, 'images');
    } catch (err) {
        console.log('could not find file ' + url);
    }
}
