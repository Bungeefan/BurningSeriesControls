"use strict";

const hosterKey = "Hoster";
const lastSeriesKey = "lastSeries";

function getStorage() {
    return chrome.storage.sync;
}

getStorage().get('settings', storage => {
    let settings = storage.settings;
    let changed = false;

    if (settings === undefined) {
        settings = {};
        changed = true;
    }
    if (settings['enabled'] === undefined) {
        changed = true;
        settings['enabled'] = true;
    }
    if (settings['automatic_play'] === undefined) {
        changed = true;
        settings['automatic_play'] = true;
    }

    if (changed) {
        getStorage().set({'settings': settings});
    }


    if (settings['enabled']) {

        if (window.location.href.match(".*:\\/\\/vivo\\.sx\\/.*")) {
            let playerView = document.querySelector(".stream-content .plyr");
            if (playerView) {
                if (settings['automatic_play']) {
                    playerView.scrollIntoView();

                    // playerView.requestFullscreen();
                    playerView.dispatchEvent(new KeyboardEvent("keydown", {
                        bubbles: true, cancelable: true, keyCode: 70 //F
                    }));
                    playerView.click();
                }
            }
        } else {
            try {
                let pathArray = window.location.pathname.split('/');
                if (pathArray.length >= 3 && window.location.pathname.indexOf("serie") !== -1) {
                    let control_previous = createControl(false);
                    let control_next = createControl(true);

                    addKeyListener(control_next, control_previous);
                    fixFooter();

                    let previousDiv = document.createElement("div");
                    previousDiv.classList.add("bs-btn-container", "previous-bs-btn-container");
                    previousDiv.appendChild(control_previous);

                    let middleDiv = document.createElement("div");
                    middleDiv.classList.add("middle-bs-btn-container");

                    let nextDiv = document.createElement("div");
                    nextDiv.classList.add("bs-btn-container", "next-bs-btn-container");
                    nextDiv.appendChild(control_next);

                    let parentBtnDiv = document.createElement("div");
                    parentBtnDiv.classList.add("bs-bt-parent-container");
                    parentBtnDiv.appendChild(previousDiv);
                    parentBtnDiv.appendChild(middleDiv);
                    parentBtnDiv.appendChild(nextDiv);

                    document.body.insertBefore(parentBtnDiv, document.querySelector("#root"));

                    processBSPayer(settings);
                }
                addLastWatchedSeries();
            } catch (e) {
                console.error(e);
            }
        }
    }
});

function fixFooter() {
    let footer = document.querySelector("footer");
    footer.style.position = "relative";
    footer.style.zIndex = "1";
}

function addKeyListener(control_next, control_previous) {
    document.body.addEventListener("keypress", evt => {
        //Arrow keys are only triggered by onkeydown, not onkeypress.
        if (evt.defaultPrevented) {
            return;
        }
        if (evt.key === "n") {
            control_next.click();
        } else if (evt.key === "b") {
            control_previous.click();
        }
    });
}

function processBSPayer(settings) {
    let playerView = document.querySelector("section.serie .hoster-player");
    if (playerView) {
        if (settings['automatic_play']) {
            playerView.scrollIntoView();

            playerView.dispatchEvent(new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                clientX: playerView.getBoundingClientRect().x, //event handler checks for >0
                clientY: playerView.getBoundingClientRect().y
            }));
        }
    }
}

function addLastWatchedSeries() {
    getStorage().get(lastSeriesKey, storage => {
        let lastWatchedSeries = storage[lastSeriesKey];
        if (lastWatchedSeries) {
            let seriesName = lastWatchedSeries.split("/")[2].replace("-", " ");

            let lastWatchedSeriesLi = document.createElement("li");
            lastWatchedSeriesLi.classList.add("custom");

            let lastWatchedSeriesA = document.createElement("a");
            lastWatchedSeriesA.href = lastWatchedSeries;
            lastWatchedSeriesA.innerText = "Letzte Serie fortsetzen (" + seriesName + ")";
            lastWatchedSeriesLi.appendChild(lastWatchedSeriesA);

            // let customDeleteBtn = document.createElement("span");
            // customDeleteBtn.classList.add("close", "display-right", "hover-red", "hover-opacity");
            // customDeleteBtn.innerText = "&#10006;";
            // customDeleteBtn.title = "Entfernen";
            // lastWatchedSeriesLi.appendChild(customDeleteBtn);

            let element = document.querySelector("#other-series-nav > ul");
            if (element) {
                element.insertBefore(lastWatchedSeriesLi, element.childNodes[0]);
            }
        }
    });
}

function createControl(next) {
    let control = document.createElement("a");
    let controlDetails = getControlDetails(next);
    if (controlDetails.href) {
        control.href = controlDetails.href;
        if (next) {
            if (Array.from(getEpisode(false)).length > 0) {
                let obj = {};
                obj[lastSeriesKey] = new URL(control.href).pathname;
                getStorage().set(obj);
            } else {
                getStorage().get(lastSeriesKey, storage => {
                    if (!storage[lastSeriesKey]) {
                        let obj = {};
                        obj[lastSeriesKey] = new URL(control.href).pathname;
                        getStorage().set(obj);
                    }
                });
            }
        }
    } else {
        control.href = "#";
        control.style.visibility = "hidden";
    }
    if (controlDetails.terminus) {
        control.title = (next ? "Nächste" : "Vorherige") + " " + controlDetails.terminus;
    }
    control.id = "bs-control-" + (next ? "next" : "previous");
    control.classList.add("bs-control");
    return control;
}

function getControlDetails(next) {
    let hoster = localStorage.getItem(hosterKey);

    let seasonsArray = Array.from(getSeason(false));
    let episodesArray = Array.from(getEpisode(false));

    let terminus;
    let href;
    if (episodesArray.length !== 0) {
        let activeEpisodeIndex = episodesArray.indexOf(getEpisode(true));

        let hosterElement = getHoster(true);
        if (hosterElement) {
            hoster = new URL(hosterElement.href).pathname.split('/').pop();
            localStorage.setItem(hosterKey, hoster);
        }

        if (next) {
            activeEpisodeIndex++;
        } else {
            activeEpisodeIndex--;
        }
        if (activeEpisodeIndex >= 0
            && activeEpisodeIndex < episodesArray.length
            && episodesArray[activeEpisodeIndex]
            && !episodesArray[activeEpisodeIndex].classList.contains("disabled")) {
            terminus = "Folge";
            href = episodesArray[activeEpisodeIndex].firstElementChild.href + (hoster ? "/" + hoster : "");

            // let serieName = document.querySelector("#sp_left > h2:nth-child(1)").firstChild.textContent.trim();
        } else {
            terminus = "Staffel";
            href = getSeasonLink(next, seasonsArray);
        }
    } else {
        if (next) {
            terminus = "Folge";
            let element = document.querySelector(".serie .episodes td a");
            if (element)
                href = element.href + (hoster ? "/" + hoster : "");
        } else {
            terminus = "Staffel";
            href = getSeasonLink(next, seasonsArray);
        }
    }
    return {terminus, href};
}

function getSeasonLink(next, seasonsArray) {
    let href;
    let activeSeasonIndex = seasonsArray.indexOf(getSeason(true));

    if (next) {
        activeSeasonIndex++;
    } else {
        activeSeasonIndex--;
    }

    if (activeSeasonIndex >= 0
        && activeSeasonIndex < seasonsArray.length
        && seasonsArray[activeSeasonIndex]
        && !seasonsArray[activeSeasonIndex].classList.contains("disabled")) {
        href = seasonsArray[activeSeasonIndex].firstElementChild.href;
    }
    return href;
}

function getEpisode(onlyActive) {
    return get("#episodes", onlyActive);
}

function getSeason(onlyActive) {
    return get("#seasons", onlyActive);
}

function getHoster(onlyActive) {
    return get(".hoster-tabs", onlyActive, "a");
}

function get(selector, onlyActive, additionalSelector) {
    let selectorString = ".serie " + selector + " li" + (onlyActive ? ".active" : "") + (additionalSelector ? " " + additionalSelector : "");
    if (onlyActive) {
        return document.querySelector(selectorString);
    } else {
        return document.querySelectorAll(selectorString);
    }
}

function activateEvent(item, actionShortName) {
    if (document.createEventObject) {
        item.fireEvent("on" + actionShortName);
    } else {
        let evt = document.createEvent("HTMLEvents");
        evt.initEvent(actionShortName, true, true); // event type, bubbling, cancelable
        item.dispatchEvent(evt);
    }
}
