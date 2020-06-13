import flatpickr from 'flatpickr';
import { Italian } from 'flatpickr/dist/l10n/it.js';
const {
  addDays,
  format,
  isToday,
  isAfter,
  parse,
  differenceInCalendarDays,
} = require('date-fns');
const { default: itLocalize } = require('date-fns/locale/it');
require('flatpickr/dist/themes/airbnb.css');
import useMaps from './useMaps';

console.log('||> langosteria v0.88');
let intervalId;

const condaDocId = 'iOgTgYXs5x';

const condaTableIds = {
  settingsServices: 'grid-a1_7s2luxz',
  settingsCaps: 'grid-PjdOUMts6h',
  settingsAddresses: 'grid-rp5_HDm90K',
  calendarAvailabilities: 'grid-50DT1drYMb',
};

const filterPickups = (i) => i.iD.startsWith('P');
const filterDeliveries = (i) => i.iD.startsWith('D');

const $SHIPPING_LOADER = '#shipping-loader';
const $SHIPPING_OPTIONS = '#shipping-options';
const $TIME_SECTION = '#time-section';
const $MODE_RADIO = 'input[name=shipping-method-choice]';
const $DATE_BUTTONS = '.date-btn';
const $TIME_BUTTONS = '.time-btn';
const $CALENDAR = '.flatpickr';
const $CALENDAR_BTN = '#calendar-btn';
const $CHECKOUT_BUTTON = '#btn-checkout';
const $NOTES_TEXTAREA = 'textarea[name=note]';
const $INPUT_TELEPHONE = 'input[name=telefono]';
const $GHOST_ORDER_DETAILS = '#myOrderDetails';
const $CLASS_SELECTED = 'selected';
const $CLASS_DISABLED = 'disabled';

document.querySelector($SHIPPING_OPTIONS).style.visibility = 'hidden';

let state = {
  pickups: [],
  deliveries: [],
  availabilities: [],
  mode: 'delivery',
  date: null,
  time: null,
  // notes: '',
};

const updateState = (actions) => {
  let nextState = { ...state };
  if (actions.type !== 'sync') {
    actions.forEach(({ type, payload }) => {
      nextState = { ...nextState, [type]: payload };
    });
  }

  const statelog = {
    mode: nextState.mode,
    date: nextState.date,
    time: nextState.time,
  };
  console.log(JSON.stringify(statelog, null, 2));
  updateDateButtons(nextState);
  updateCalendar(nextState);
  updateTimeButtons(nextState);
  updateCheckoutButton(nextState);

  updateJsonString(nextState);

  state = nextState;
};

const updateJsonString = ({ mode, date, time }) => {
  if (!document.querySelector($GHOST_ORDER_DETAILS)) return;

  const notes = document.querySelector('#myNotes').value;
  const telephone = document.querySelector('#myTelephone').value;

  const finalState = { mode, date, time, notes, telephone };
  document.querySelector($GHOST_ORDER_DETAILS).value = JSON.stringify(
    finalState
  );
};

const updateDateButtons = ({ availabilities, mode, date }) => {
  const selectedAvailability = availabilities.find(
    (a) => a.dateFlatpickr === date
  );

  console.log('selectedAvailability', selectedAvailability);

  document.querySelectorAll($DATE_BUTTONS).forEach((el) => {
    // update enable/disable
    const availability = availabilities.find(
      (a) => a.dateFlatpickr === el.dataset.date
    );

    // enabled/disabled
    let isDisabled;
    if (
      date &&
      mode === 'delivery' &&
      !availability.d1Availability &&
      !availability.d2Availability
    ) {
      isDisabled = true;
    } else if (
      date &&
      mode === 'pickup' &&
      !availability.p1Availability &&
      !availability.p2Availability
    ) {
      isDisabled = true;
    }

    if (isDisabled) {
      el.classList.add($CLASS_DISABLED);
      el.classList.remove($CLASS_SELECTED);
      el.style.pointerEvents = 'none';
    } else {
      el.classList.remove($CLASS_DISABLED);
      el.style.pointerEvents = null;
    }

    // selected or not
    if (
      selectedAvailability &&
      el.dataset.date === selectedAvailability.dateFlatpickr
    ) {
      el.classList.add($CLASS_SELECTED);
    } else {
      el.classList.remove($CLASS_SELECTED);
    }
  });
};

const updateCalendar = ({ availabilities, mode, date }) => {
  const enable = availabilities.reduce((res, curr) => {
    if (mode === 'delivery' && (curr.d1Availability || curr.d2Availability)) {
      return [curr.dateFlatpickr, ...res];
    } else if (
      mode === 'pickup' &&
      (curr.p1Availability || curr.p2Availability)
    ) {
      return [curr.dateFlatpickr, ...res];
    }
    return res;
  }, []);

  const fp = document.querySelector($CALENDAR)._flatpickr;
  if (fp && fp.destroy) {
    fp.destroy();
  }

  const selDate = parse(date, 'yyyy-MM-dd', new Date());
  const difference = differenceInCalendarDays(selDate, new Date());

  if (difference >= 3) {
    document.querySelector($CALENDAR_BTN).classList.add($CLASS_SELECTED);
  } else {
    document.querySelector($CALENDAR_BTN).classList.remove($CLASS_SELECTED);
  }

  flatpickr($CALENDAR, {
    locale: Italian,
    wrap: true,
    enable,
    defaultDate: date,
    altInput: true,
    altFormat: 'j/n/Y',
    altInputClass: 'button options display-none',
    onChange: (selectedDates, dateStr) =>
      updateState([
        { type: 'date', payload: dateStr },
        { type: 'time', payload: null },
      ]),
  });
};

const updateTimeButtons = ({
  pickups,
  deliveries,
  availabilities,
  mode,
  date,
  time,
}) => {
  const selectedAvailability = availabilities.find(
    (a) => a.dateFlatpickr === date
  );

  document.querySelectorAll($TIME_BUTTONS).forEach((el, idx) => {
    // visibility
    // el.style.visibility = date ? 'visible' : 'hidden';

    // content
    el.textContent =
      mode === 'delivery' ? deliveries[idx].label : pickups[idx].label;

    // enabled/disabled
    let isDisabled;
    if (!date) {
      isDisabled = true;
    } else if (date && mode === 'delivery') {
      isDisabled =
        el.dataset.timeslot === '1'
          ? !selectedAvailability.d1Availability
          : !selectedAvailability.d2Availability;
    } else if (date && mode === 'pickup') {
      isDisabled =
        el.dataset.timeslot === '1'
          ? !selectedAvailability.p1Availability
          : !selectedAvailability.p2Availability;
    }
    if (isDisabled) {
      el.classList.add($CLASS_DISABLED);
      el.classList.remove($CLASS_SELECTED);
      el.style.pointerEvents = 'none';
    } else {
      el.classList.remove($CLASS_DISABLED);
      el.style.pointerEvents = null;
    }

    // selected or not
    if (time === el.dataset.timeslot) {
      el.classList.add($CLASS_SELECTED);
    } else {
      el.classList.remove($CLASS_SELECTED);
    }
  });
};

const updateCheckoutButton = ({ mode, date, time }) => {
  const visibility = mode && date && time ? 'visible' : 'hidden';
  document.querySelector($CHECKOUT_BUTTON).style.visibility = visibility;
};

const setupMaps = async () => {
  const { axiosInstance } = await import('./useAxios');
  const { coda } = await import('./useCoda');
  const { getTableData } = coda(axiosInstance);

  // GET DATA FROM CODA
  const capsObj = await getTableData({
    docId: condaDocId,
    tableIdOrName: condaTableIds.settingsCaps,
  });
  const caps = capsObj.map((i) => i['cAP']);

  useMaps(caps, (canShip) => {
    document.querySelector('input[data-mode=delivery]').disabled = !canShip;
    if (!canShip) {
      updateState([{ type: 'mode', payload: 'pickup' }]);
    }
  });

  const script = document.createElement('script');
  script.onload = function () {
    console.log('maps loaded');
  };
  script.src =
    'https://maps.googleapis.com/maps/api/js?key=AIzaSyAWDAlwUG-CInbppjWfuIjdocPX-zUzAxU&libraries=places&callback=initAutocomplete';
  document.body.appendChild(script);
};

const setupGhostFields = () => {
  const ghostOrderDetails = document.createElement('textarea');
  ghostOrderDetails.id = 'myOrderDetails';
  ghostOrderDetails.name = 'myOrderDetails';
  document
    .querySelector($NOTES_TEXTAREA)
    .parentElement.appendChild(ghostOrderDetails);
  ghostOrderDetails.style.display = 'none';

  const ghostNotes = document.createElement('textarea');
  ghostNotes.id = 'myNotes';
  ghostNotes.name = 'myNotes';
  document.querySelector($NOTES_TEXTAREA).parentElement.appendChild(ghostNotes);
  ghostNotes.style.display = 'none';

  const ghostTelephone = document.createElement('textarea');
  ghostTelephone.id = 'myTelephone';
  ghostTelephone.name = 'myTelephone';
  document
    .querySelector($NOTES_TEXTAREA)
    .parentElement.appendChild(ghostTelephone);
  ghostTelephone.style.display = 'none';

  document.querySelector($NOTES_TEXTAREA).onkeydown = () =>
    (ghostNotes.value = document.querySelector($NOTES_TEXTAREA).value);
  // updateNotes('notes', document.querySelector($GHOST_ORDER_DETAILS).value);
  document.querySelector($NOTES_TEXTAREA).onchange = () =>
    (ghostNotes.value = document.querySelector($NOTES_TEXTAREA).value);
  // updateNotes('notes', document.querySelector($GHOST_ORDER_DETAILS).value);

  document.querySelector($INPUT_TELEPHONE).onkeydown = () =>
    (ghostTelephone.value = document.querySelector($INPUT_TELEPHONE).value);
  // updateNotes('tel', document.querySelector($INPUT_TELEPHONE).value);
  document.querySelector($INPUT_TELEPHONE).onchange = () =>
    (ghostTelephone.value = document.querySelector($INPUT_TELEPHONE).value);
  // updateNotes('tel', document.querySelector($INPUT_TELEPHONE).value);
};

const setupTimeButtons = () => {
  document
    .querySelectorAll($TIME_BUTTONS)
    .forEach(
      (el) =>
        (el.onclick = () =>
          updateState([{ type: 'time', payload: el.dataset.timeslot }]))
    );
};

const setupCalendar = () =>
  (document.querySelector($CALENDAR).innerHTML = `
  <input class="button options" type="text" placeholder="altra data" style="display: none;" data-input>

  <a id="calendar-btn" class="button options input-button" title="toggle" data-toggle>...</a>
  `);

const setupDateButtons = () => {
  document.querySelectorAll($DATE_BUTTONS).forEach((el) => {
    const btnDate = addDays(new Date(), +el.dataset.adddays);

    // set data-date attribute
    const attributeValue = format(btnDate, 'yyyy-MM-dd', {
      locale: itLocalize,
    });
    el.setAttribute('data-date', attributeValue);

    // set label text
    el.textContent = format(btnDate, 'EEEE d', {
      locale: itLocalize,
    });

    el.onclick = () =>
      updateState([
        { type: 'date', payload: el.dataset.date },
        { type: 'time', payload: null },
      ]);
  });

  // document.querySelectorAll($DATE_BUTTONS).forEach(
  //   (el) =>
  //     (el.onclick = () =>
  //       updateState([
  //         { type: 'date', payload: el.dataset.date },
  //         { type: 'time', payload: null },
  //       ]))
  // );
};

const setupModeRadios = () => {
  setInterval(
    function (getState, updState) {
      const radios = document.querySelectorAll($MODE_RADIO);
      if (radios[0].dataset.mode) return;
      radios[0].setAttribute('data-mode', 'delivery');
      radios[1].setAttribute('data-mode', 'pickup');

      const st = getState();
      if (st.mode === 'delivery') {
        document.querySelector('input[data-mode=delivery]').checked = true;
      } else if (st.mode === 'pickup') {
        document.querySelector('input[data-mode=pickup]').checked = true;
      }

      // const currentMode = document.querySelector(
      //   'input[name=shipping-method-choice]:checked'
      // ).dataset.mode;
      // updState([{ type: 'mode', payload: currentMode }]);

      radios.forEach(
        (el) =>
          (el.onchange = () => {
            updState([
              { type: 'mode', payload: el.dataset.mode },
              { type: 'date', payload: null },
              { type: 'time', payload: null },
            ]);
          })
      );
    },
    1000,
    getState,
    updateState
  );
};

const getState = () => state;

const load = async () => {
  clearInterval(intervalId);
  setupCalendar();

  const { axiosInstance } = await import('./useAxios');
  const { coda } = await import('./useCoda');
  const { getTableData, getViewData } = coda(axiosInstance);

  // GET DATA FROM CODA
  // const capsObj = await getTableData({
  //   docId: condaDocId,
  //   tableIdOrName: condaTableIds.settingsCaps,
  // });
  // const caps = capsObj.map((i) => i['cAP']);

  const servicesObj = await getTableData({
    docId: condaDocId,
    tableIdOrName: condaTableIds.settingsServices,
  });
  const pickups = servicesObj.filter(filterPickups);
  const deliveries = servicesObj.filter(filterDeliveries);

  const addresses = await getTableData({
    docId: condaDocId,
    tableIdOrName: condaTableIds.settingsAddresses,
  });

  const availabilities = await getTableData({
    docId: condaDocId,
    tableIdOrName: condaTableIds.calendarAvailabilities,
  });

  const nextAvailabilities = availabilities.filter(
    (a) =>
      isToday(new Date(a.dateFlatpickr)) ||
      isAfter(new Date(a.dateFlatpickr), new Date())
  );

  updateState([
    { type: 'availabilities', payload: nextAvailabilities },
    { type: 'pickups', payload: pickups },
    { type: 'deliveries', payload: deliveries },
  ]);

  document.querySelector($SHIPPING_LOADER).style.display = 'none';
  document.querySelector($SHIPPING_OPTIONS).style.visibility = 'visible';
  setupModeRadios();
  setupDateButtons();
  setupTimeButtons();
  setupGhostFields();
};

setupMaps();

intervalId = setInterval(function () {
  console.log('search for radios...');
  if (!!document.querySelector($MODE_RADIO)) {
    console.log('radios found!');
    load();
  }
}, 1000);
