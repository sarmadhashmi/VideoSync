# About

This small application allows you to take your local video files and stream them to your friends or family while keeping the video in sync. You can skip back and forth and the video will be updated for all connected clients, keeping everyone in sync with what's going on in the video.

# HOW TO
(Need to have [NodeJS](www.nodejs.org) installed)
1. Download the zip file
2. Extract and run `npm install` in the extracted folder
3. Run `node app.js`
4. Navigate to http://localhost:3001 and try connecting to it from other devices (assuming your ports are forwarded and you know your local/external IP)

# TODO
* Test with Safari, Firefox, IE
* Create a better UI
* Users that are not the host should not be allowed to move around the video (if option is specified in config)
