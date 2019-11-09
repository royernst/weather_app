(async function() {
    "use strict";
    requirejs.config({
        paths: {
            cities: "city.list.json?callback=define",
            keys: "key.json?callback=define"
            // cities: "city",
            // keys: "key"
        },
        waitSeconds: 10,
        catchError: true
    });

    /**
     * This custom code for an asynchronous forEach method under the Array prototype object
     * in order to request multiple files asynchronously
     */
    Array.prototype.asyncForEach = async function(callback) {
        if (typeof callback !== "function") {
            throw new TypeError(`${callback} is not a function`);
        }
        for (let i = 0; i < this.length; i++) {
            await callback(this[i], i, this);
        }
    }

    /**
     * Simulates loading external data from a remote server.
     * Front loading these asynchronously to prevent needing to fetch when clicking the submit button. City list is YUGE...
     * like 23mb of text. Definitely wouldn't do this on a production site. Normally I'd find a different way to
     * narrow down city data or just import it directly as a module, but this was more for my own edification
     * and an excuse to acquaint myself with using requirejs on the front end. The OpenWeatherAPI accepts the city info
     * as queries passed in the URL, and this is really only useful if I want to sanitize my inputs by only allowing
     * the user to select from a drop-down menu or something in the future.
     */
    let fileInfo = getExternalFileInfo();
    let cityInput = document.getElementById("city_input");
    let submitButton = document.getElementById("submit_button");
    let stateSelector = document.getElementById("state_list");
    let stateList = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA",
        "MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
        "VA","WA","WV","WI","WY"];
    stateList.forEach(state => {
        let stateOption = document.createElement("option");
        stateOption.value = stateOption.innerText = state;
        stateSelector.appendChild(stateOption);
    });
    submitButton.addEventListener("click", async() => {
        // Make sure fileInfo has finished loading before continuing incase network is slow
        fileInfo = await fileInfo;
        let cities, weather, weatherKey, locationKey, userCity, userState, cityId;
        try {
            cities = fileInfo["cities"];
            weatherKey = fileInfo["keys"].weather;
            locationKey = fileInfo["keys"].loc;
            userCity = cityInput.value.trim().toLowerCase();
            userState = stateSelector.value.toLowerCase();
            // userCity = "buffalo";
            // userState = "ny";
            cityId = await getCityId(locationKey, cities, userCity, userState);
            weather = await getWeather(weatherKey, cityId);
            debugger;
        } catch (e) {
            // TODO: Find more elegant way to handle input sanitization rather than try/catching a block
            alert("Error attempting to fetch location or weather data:" + e);
        }
        // weather = respWeather.list;
        // let dts = [];
        // weather.forEach(result => {
            // dts.push(result.dt);
        // });
        // dts = Math.min(...dts);
        // weather = weather.filter(res => res.dt === dts)[0];
        // // document.getElementById("outputLocation").textContent = response.name;
        // // document.getElementById("outputTemp").textContent = fahrenheitTemp.toString() + "°F";
        // // document.getElementById("outputWeatherImage").src = "http://openweathermap.org/img/w/" + response.weather[0].icon + ".png";
        // // document.getElementById("outputCurrentConditions").textContent = response.weather[0].description;
    });

    async function getExternalFileInfo() {

        // Normally I'd define the config for the file keys in a separate file, but in this case
        // I'm just making a copy of the requirejs config stuff for expediency so I only have to
        // update the info in one place while testing the code.
        let fileKeys = Object.keys(requirejs.s.contexts["_"].config.paths);
        let infoObj = {};
        await fileKeys.asyncForEach(async(key) => {
            // Typically I try to keep function calls out of a function to make unit testing easier, but since this is a personal
            // project that I won't be unit testing I'm able to get away with it.
            let data = new Promise(async(res) => {
                let resultKeys;
                try {
                    // Here I'm fetching the API info from an external file so I don't have to manually input it or hard code it in.
                    resultKeys = await getFile(key);
                } catch (err) {
                    // This block allows me to manually enter an API key in the event that I can't fetch the file directly.
                    if (err.requireModules[0] === "keys") {
                        resultKeys = {
                            weather: getReplacementKey("weather"),
                            loc: getReplacementKey("location info")
                        };
                    } else if (err.requireModules[0] === "cities") {
                        resultKeys = getReplacementKey("city info");
                    } else {
                        alert("Please contact site admin for API key.");
                        resultKeys = null;
                    }
                }
                res(resultKeys);
            });
            infoObj[key] = await data;
        });
        return infoObj;

    }

    async function getFile(fileName) {
        let file = new Promise((res, rej) => {
            require([`${fileName}`], resp => {
                res(resp);
            }, err => {
                console.log(`File "${fileName}" not found.`);
                rej(err);
            });
        });
        return await file;
    }

    function getReplacementKey(keyType) {
        let replKey = prompt(`Please provide an API key in order to get ${keyType}.`, `${keyType.charAt(0).toUpperCase() + keyType.slice(1)} key`);
        if (!replKey) {
            throw new Error("No API key was provided.");
        };
        return replKey;
    }

    /**
     * Grabs the appropriate ID for the user's city from the city list
     */
    async function getCityId(key, cityList, userCity, userState) {
        let fetchUrl = `https://us1.locationiq.com/v1/search.php?key=${key}&city=${userCity}&state=${userState}&countrycodes=us&addressdetails=1&dedupe=1&format=json`;
        let userCityInfo = await fetch(fetchUrl);
        userCityInfo = await userCityInfo.json();
        // Filtering out all results that don't match the provided city name
        userCityInfo = userCityInfo.filter(info => info.address.city && (info.address.city.toLowerCase() === userCity));
        // These were returned as strings, so need to parse them as floats to round to the second decimal place in order to get a close-enough comparison
        // when searching through the coords of the city list with an area as big as a city
        let userCityCoords = {
            lon: parseFloat(userCityInfo[0].lon).toFixed(2),
            lat: parseFloat(userCityInfo[0].lat).toFixed(2)
        };
        // Compares the coordinates of the user location with the coordinates of the city list and returns the matching city's ID
        return cityList.filter(city => (city.coord.lon.toFixed(2) === userCityCoords.lon) && (city.coord.lat.toFixed(2) === userCityCoords.lat))[0].id;
    }

    /**
     * Fetches current weather from a location based on the provided city ID
     */
    async function getWeather(key, cityId) {
        let weather = await fetch(`http://api.openweathermap.org/data/2.5/weather?id=${cityId}&APPID=${key}`);
        return await weather.json();
    }

})();
