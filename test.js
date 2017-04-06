var request = require("request");

var options = { method: 'POST',
  url: 'https://accounts.eu1.gigya.com/accounts.initRegistration',
  qs: 
   { apiKey: '3_Pax_srwZ6L6thNGQ4d8nFGSnCU5AxIrsQo6oR0SQD-yYibdLPKCPl_iZiWVr_0Wu',
     userKey: 'AHOCBBStw4BC',
     secret: 'S13yBuUCksdJRvq87BQxcYqzmNCmOyme' },
  headers: 
   { 'postman-token': 'ffe8c657-9f11-e11a-3b82-ec0761856fc4',
     'cache-control': 'no-cache',
     'content-type': 'application/json' } };

request(options, function (error, response, body) {
  if (error) throw new Error(error);
  
  body = JSON.parse(body);
  console.log(body);

  var options = { method: 'POST',
    url: 'https://accounts.eu1.gigya.com/accounts.register',
    qs: 
    { apiKey: '3_Pax_srwZ6L6thNGQ4d8nFGSnCU5AxIrsQo6oR0SQD-yYibdLPKCPl_iZiWVr_0Wu',
      userKey: 'AHOCBBStw4BC',
      secret: 'S13yBuUCksdJRvq87BQxcYqzmNCmOyme' },
    headers: 
    { 'cache-control': 'no-cache',
      'content-type': 'application/x-www-form-urlencoded' },
    form: 
    { email: 'mkoc3@berlingskemedia.dk',
      password: 'Gigya123',
      profile: '{"firstName": "Martin", "lastName": "Kock"}',
      regToken: body.regToken,
      finalizeRegistration: 'true' } };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    console.log(body);
  });
  
});
