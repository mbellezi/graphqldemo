const express = require('express');
const app = express();

app.use(express.static('dist/graphqldemo'));


app.listen(4200, function() {
  console.log('App GraphQL escutando na porta 4200!');
});
