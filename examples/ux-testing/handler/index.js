exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
        "x-custom-header" : "my custom header value"
    },
    body: JSON.stringify(event)
  };
};
