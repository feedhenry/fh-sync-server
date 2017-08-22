/**
 * Create a div element that and append it as a child for a selected
 * node.
 *
 * @param {Object} statOptions
 * @param {String} parentElementId The id of the element to add child
 * node to.
 */
function createStatCard(statOptions, parentElement) {
  // The outmost <div/>, this is a bootstrap column.
  var columnElem = document.createElement('div');
  columnElem.className = 'col-xs-6 col-sm-4 col-md-4';

  // The actual patternfly card element.
  var cardElem = document.createElement('div');
  cardElem.className = 'card-pf card-pf-accented card-pf-aggregate-status';
  cardElem.id = statOptions.idPrefix + statOptions.elementId || '';

  // The card element itself.
  var cardTitleElem = document.createElement('h2');
  cardTitleElem.className = 'card-pf-title';
  var cardTitle = document.createTextNode(statOptions.title);
  cardTitleElem.appendChild(cardTitle);

  // The body of the card.
  var cardBodyElem = document.createElement('div');
  cardBodyElem.className = 'card-pf-body';

  // Outer contents of the card body.
  var cardValueParagraphElem = document.createElement('p');
  cardValueParagraphElem.className = 'card-pf-aggregate-status-notifications';

  // The value of the card, add an id here so it can be updated in the future.
  var cardValueSpanElem = document.createElement('span');
  cardValueSpanElem.id = statOptions.idPrefix + statOptions.title + '-value';
  cardValueSpanElem.className = 'card-pf-aggregate-status-notification';
  var cardValue = document.createTextNode(statOptions.value);
  cardValueSpanElem.appendChild(cardValue);

  // Put everything together and append into the parent element.
  cardValueParagraphElem.appendChild(cardValueSpanElem);
  cardBodyElem.appendChild(cardValueParagraphElem);
  cardElem.appendChild(cardTitleElem);
  cardElem.appendChild(cardBodyElem);
  columnElem.appendChild(cardElem);

  parentElement.appendChild(columnElem);
}

/**
 * Create a title section for each metric section. Metric cards should be
 * appended inside the created <div>.
 *
 * @param {String} sectionName The title of the section
 * @param {*} parentElement The element to append this section into
 */
function createStatSection(sectionName, parentElement) {
  var sectionDiv = document.createElement('div');
  sectionDiv.id = sectionName;
  sectionDiv.className = 'row row-cards-pf';

  var sectionTitle = document.createElement('h2');
  sectionTitle.appendChild(document.createTextNode(sectionName));

  sectionDiv.appendChild(sectionTitle);

  parentElement.appendChild(sectionDiv);
}

/**
 * Update the value of a metric.
 *
 * @param {Object} statOptions
 * @param {String} statOptions.idPrefix Value to prefix when getting an element
 * @param {String} statOptions.title The title of the element to update
 * @param {String} statOptions.value The new value of the element
 */
function updateStatCard(statOptions) {
  var cardValueElem = document.getElementById(statOptions.idPrefix + statOptions.title + '-value');
  cardValueElem.innerText = statOptions.value;
}

/**
 * Get stats from the stats endpoint in the server.
 *
 * @param {Function} cb Callback
 */
function retrieveSyncStats(cb) {
  fetch('/sys/info/stats')
  .then(res => res.json())
  .then(cb)
  .catch(err => console.error(err));
}

/**
 * For each stat add or update element in page.
 *
 * @param {Object} statsResponse
 * @param {Object[]} statsResponse.metrics Metrics from Sync Server
 */
function onStatsResponse(statsResponse) {
  for(var metricGroup in statsResponse.metrics) {
    if(!document.getElementById(metricGroup)) {
      createStatSection(metricGroup, document.getElementById('stats-container'));
    }

    for(var stat in statsResponse.metrics[metricGroup]) {
      var statValue = statsResponse.metrics[metricGroup][stat].current;
      if(typeof statsResponse.metrics[metricGroup][stat] === 'string') {
        statValue = statsResponse.metrics[metricGroup][stat];
      }

      var cardConfig = {
        elementId: stat,
        idPrefix: metricGroup,
        title: stat,
        value: statValue
      };

      if(document.getElementById(metricGroup + stat)) {
        updateStatCard(cardConfig);
      } else {
        createStatCard(cardConfig, document.getElementById(metricGroup));
      }
    }
  }
}

$(document).ready(function() {
  // Do an initial get so the page has values fast, then poll.
  retrieveSyncStats(onStatsResponse);
  setInterval(retrieveSyncStats.bind(null, onStatsResponse), 5000);
});
