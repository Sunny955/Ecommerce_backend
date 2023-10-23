const axios = require("axios");

const MAPQUEST_API_KEY = process.env.API_KEY;

const validateAddressWithMapQuest = async (address) => {
  try {
    const response = await axios.get(
      "http://www.mapquestapi.com/geocoding/v1/address",
      {
        params: {
          key: MAPQUEST_API_KEY,
          location: `${address.city},${address.district},${address.pincode},${address.country}`,
          outFormat: "json",
        },
      }
    );

    const locations = response.data.results[0].locations;
    if (locations.length === 0) {
      return false;
    }

    const validCity = locations[0].adminArea5;
    const validDistrict = locations[0].adminArea4;
    const validPincode = locations[0].postalCode;
    const validCountry = locations[0].adminArea1;

    return (
      address.city.toLowerCase() === validCity.toLowerCase() &&
      address.district.toLowerCase() === validDistrict.toLowerCase() &&
      address.pincode.toLowerCase() === validPincode.toLowerCase() &&
      address.country.toLowerCase() === validCountry.toLowerCase()
    );
  } catch (error) {
    console.error(error.message);
    return false;
  }
};

module.exports = { validateAddressWithMapQuest };
