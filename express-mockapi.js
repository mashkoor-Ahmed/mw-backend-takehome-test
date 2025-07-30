const express = require('express');
const app = express();
const port = 3003;

app.get('/supercar/valuations/:vrm', (req, res) => {
  res.json({
	"vin": "2HSCNAPRX7C385251",
	"registrationDate": "2012-06-14T00:00:00.0000000",
	"plate": {
		"year": 2012,
		"month": 4
	},
	"valuation": {
		"lowerValue": 22350,
		"upperValue": 24750
	}
})
});

app.get('/premiumcar/valueCar', (req, res) => {
  const xml = `
<root>
  <RegistrationDate>2012-06-14T00:00:00.0000000</RegistrationDate>
  <RegistrationYear>2001</RegistrationYear>
  <RegistrationMonth>10</RegistrationMonth>
  <ValuationPrivateSaleMinimum>11500</ValuationPrivateSaleMinimum>
  <ValuationPrivateSaleMaximum>12750</ValuationPrivateSaleMaximum>
  <ValuationDealershipMinimum>9500</ValuationDealershipMinimum>
  <ValuationDealershipMaximum>10275</ValuationDealershipMaximum>
</root>`.trim();

  res.status(200).set('Content-Type', 'application/xml').send(xml);
});

app.listen(port, () => console.log(`mock api app is listening on port ${port}!`))