(async function() {
    "use strict";
    requirejs.config({
        paths: {
            // cities: "city.list.json?callback=define",
            // keys: "key.json?callback=define"
            cities: "city",
            keys: "key"
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
     *
     * Front load these asynchronously to prevent needing to fetch when clicking the submit button. City list is YUGE...`
     * like 23mb of text. Definitely wouldn't do this on a production site. Normally I'd find a different way to
     * solve this particular problem or just import it directly as a module, but this was more for my own edification
     * and an excuse to acquaint myself with using requirejs on the front end. The OpenWeatherAPI accepts the city info
     * as queries passed in the URL, and this is really only useful if I want to sanitize my inputs by only allowing
     * the user to select from a drop-down menu or something in the future.
     */
    let fileInfo = getExternalFileInfo();
    debugger;
    let locInput = document.getElementById("location");
    let submitButton = document.getElementById("submit_button");
    submitButton.addEventListener("click", async() => {
        let cities = await fileInfo["cities"];
        let keys = await fileInfo["keys"];
        debugger;
        if (!cities.length || !keys.length) {}
        let userLoc = locInput.value.trim().toLowerCase();
        let locKey = keys.locKey;
        let weatherkey = keys.weather;
        let cityId = getCityId(cities, userLoc);

        //`https://us1.locationiq.com/v1/search.php?key=${locKey}&city=${input1}&state=${input2}&format=json`

        fetch(`http://api.openweathermap.org/data/2.5/forecast?id=${cityId}&APPID=${weatherkey}`).then(res => {
            return res.json();
        }).then(respWeather => {
            weather = respWeather.list;
            let dts = [];
            weather.forEach(result => {
                dts.push(result.dt);
            });
            dts = Math.min(...dts);
            weather = weather.filter(res => res.dt === dts)[0];
            // document.getElementById("outputLocation").textContent = response.name;
            // document.getElementById("outputTemp").textContent = fahrenheitTemp.toString() + "°F";
            // document.getElementById("outputWeatherImage").src = "http://openweathermap.org/img/w/" + response.weather[0].icon + ".png";
            // document.getElementById("outputCurrentConditions").textContent = response.weather[0].description;
        });
    });



    // let newArray = [1, 2, 3];

    // await newArray.asyncForEach(thing => {
    //     // This is an actual callback. Still need to work on the iterator and figure out the properties of forEach outside of a regular for loop
    //     alert(thing);
    // });

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

    function getCityId(cityList, cityName) {
        //         // Filtering out all non-US cities for this app
        //         let cities = resp.filter(city => city.country === "US");
        //         res(cities);
        let filteredCities = cityList.filter(city => {
            // Hard-coded to narrow down selection to the correct Buffalo while in dev
            return city.name.toLowerCase() === cityName && Math.trunc(city.coord.lon) % 78 === 0;
        });
        if (!filteredCities.length) {
            console.error("No matching cities found");
            return;
        } else if (filteredCities.length === 1) {
            // This is hard-coded until the Google Geocoding stuff is set up
            return filteredCities[0].id;
        } else {

            console.warn("Too many cities found, please narrow search");
            getCityId(filteredCities, cityName);
        }
    }


})();