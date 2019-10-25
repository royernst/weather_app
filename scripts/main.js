(function() {
    requirejs.config({
        paths: {
            cityList: "city.list.json?callback=define",
            key: "key.json?callback=define"
        }
    });

    let locInput = document.getElementById("location");
    locInput.addEventListener("change", () => {
        let userLoc = locInput.value.trim().toLowerCase();
        getMetadata().then(vals => {
            let cities = vals[0];
            let key = vals[1];

            let cityId = getCityId(cities, userLoc);

            fetch(`http://api.openweathermap.org/data/2.5/forecast?id=${cityId}&APPID=${key}`).then(res => {
                return res.json();
            }).then( weather => {
                debugger;
                document.getElementById("outputLocation").textContent = response.name;
                document.getElementById("outputTemp").textContent = fahrenheitTemp.toString() + "°F";
                document.getElementById("outputWeatherImage").src = "http://openweathermap.org/img/w/" + response.weather[0].icon + ".png";
                document.getElementById("outputCurrentConditions").textContent = response.weather[0].description;
            });
        });
    })

    function getCityId(cityList, cityName) {
        let validCity = cityList.filter(city => {
            return city.name.toLowerCase() === cityName;
        });
        if (!validCity) {
            console.error("City not found");
            return;
        }
        debugger;
    }

    async function getMetadata(userInput) {
        let cities = new Promise((res, rej) => {
            return require(["cityList"], resp => {
                // Filtering out all non-US cities for this app
                res(resp.filter(city => {
                    return city.country === "US";
                }));
            });
        });
        let key = new Promise((res, rej) => {
            return require(["key"], resp => {
                res(resp.key);
            });
        });
        return await Promise.all([cities, key]).then(values => {
            return values;
        });
        
    }
})()