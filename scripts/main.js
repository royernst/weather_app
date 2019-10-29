(function() {
    requirejs.config({
        paths: {
            cityList: "city.list.json?callback=define",
            key: "key.json?callback=define"
        },
        waitSeconds: 10,
        catchError: true
    });

    // Loading these asynchronously on page load to prevent a delay when clicking the submit button
    let cityList = getCityList();
    let keys = getKeys();

    let locInput = document.getElementById("location");
    let submitButton = document.getElementById("submit_button");
    submitButton.addEventListener("click", () => {
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
            // Recursive placeholder
            console.warn("Too many cities found, please narrow search");
            getCityId(filteredCities, cityName);
        }

    }

    async function getCityList() {
        return new Promise((res, rej) => {
            require(["cityList"], resp => {
                // Filtering out all non-US cities for this app
                res(resp.filter(city => city.country === "US"));
            }, err => {
                console.log("Cities file not found.");
            })
        });
    }

    async function getKeys() {
        return new Promise((res, rej) => {
            require(["key"], resp => {
                res(resp);
            }, err => {
                // TODO: Have a box with an option to either upload a key file or manually input the key.
                console.log("Keys file not found, prompting user for replacement.");
                let replWKey = prompt("Please provide an API key in order to get weather.", "API Key");
                if (!replKey) {
                    throw new Error("No API key was provided.");
                };
                res({
                    weather: replWKey,
                    locIq: void 0 // Undef unless one can be offered
                });
            });
        });
    }
})();