(async function() {
    requirejs.config({
        paths: {
            // cityList: "city.list.json?callback=define",
            key: "key.json?callback=define",
            cityList: "city"
                // key: "key"
        },
        waitSeconds: 10,
        catchError: true
    });

    /**
     *
     * Front load these asynchronously to prevent a delay when clicking the submit button. City list is YUGE.
     * Like 23mb of text huge. Definitely wouldn't do this on a production site, was more for my own edification
     * and an excuse to acquaint myself with using requirejs on the front end. The OpenWeatherAPI accepts the city info
     * as queries passed in the URL, and this is really only useful if I want to sanitize my inputs by only allowing
     * the user to select from a drop-down menu or something in the future.
     */
    let keys, cities;
    try {
        keys = await getFile("key");
        cities = await getFile("cityList");
    } catch (err) {
        // Hide usual elements, replace with message
        // "Do you have an API key to provide? (Yes) (No)"
        // if Yes, then add a box to input one in text
        // if No, then replace page with "Sorry, can't use site without API key. Please contact site admin for key."

    }

    let locInput = document.getElementById("location");
    let submitButton = document.getElementById("submit_button");
    submitButton.addEventListener("click", () => {
        if (!cityList.length || !keys.length) {}
        let userLoc = locInput.value.trim().toLowerCase();

        getMetadata().then(vals => {
            let lKey = keys.locIq;
            let wkey = keys.weather;
            let cityId = getCityId(cityList, userLoc);

            //`https://us1.locationiq.com/v1/search.php?key=${lKey}&city=${input1}&state=${input2}&format=json`

            fetch(`http://api.openweathermap.org/data/2.5/forecast?id=${cityId}&APPID=${wkey}`).then(res => {
                return res.json();
            }).then(weather => {
                weather = weather.list;
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
    })

    function getCityId(cityList, cityName) {
        let filteredCities = cityList.filter(city => {
            // Hard-coded to narrow down selection to the correct Buffalo while in dev
            return city.name.toLowerCase() === cityName && Math.trunc(city.coord.lon) % 78 === 0;
        });
        if (!filteredCities.length) {
            console.error("No matching cities found");
            return;
        } else
        if (filteredCities.length === 1) {
            // This is hard-coded until the Google Geocoding stuff is set up
            return filteredCities[0].id;
        } else {

            console.warn("Too many cities found, please narrow search");
            getCityId(filteredCities, cityName);
        }

    }

    async function getFile(fileName) {
        let file = new Promise((res, rej) => {
            require([`${fileName}`], resp => {
                res(resp);
            }, err => {
                console.log(`File "${fileName}" not found.`);
                rej(void 0);
            });
        });
        return await file;
    }

    function getReplacementKey(keyType) {
        let replWKey = prompt("Please provide an API key in order to get weather.", "API Key");
        if (!replWKey) {
            throw new Error("No API key was provided.");
        };
        return replWKey;
    }

    // async function getKeys() {
    //     return new Promise((res, rej) => {
    //         return require(["key"], resp => {
    //             res(resp);
    //         }, err => {
    //             // TODO: Have a box with an option to either upload a key file or manually input the key.
    //             console.log("Keys file not found, prompting user for replacement.");
    //         });
    //         // Filtering out all non-US cities for this app
    //         let cities = resp.filter(city => city.country === "US");
    //         res(cities);
    //     });
    // }
})();