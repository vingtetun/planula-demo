/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


/*::
import type {Address, DOM} from "reflex"
import type {Model, Action} from './devtools'
import type {Result} from "./result"
*/

import * as Settings from '../common/settings';
import * as Runtime from '../common/runtime';
import * as Unknown from '../common/unknown';
import {merge, always} from '../common/prelude';
import {cursor} from '../common/cursor';
import {Effects, html, thunk, forward} from 'reflex';
import {Style, StyleSheet} from '../common/style';


const descriptions =
  { 'debugger.remote-mode': 'Enable Remote DevTools'
  , 'apz.overscroll.enabled': 'Enable overscroll effect'
  , 'debug.fps.enabled': 'FPS'
  , 'debug.paint-flashing.enabled': 'Paint flashing'
  , 'layers.low-precision': 'Low precision buffer & paint'
  , 'layers.low-opacity': 'Low precision opacity'
  , 'layers.draw-borders': 'Draw layer borders'
  , 'layers.draw-tile-borders': 'Draw tile borders'
  , 'layers.dump': 'Layers dump'
  , 'layers.enable-tiles': 'Enable tiles'
  , 'layers.async-pan-zoom.enabled': 'Enable APZC (restart required)'
  };

const writeValue = (key, value) =>
  ( key === 'debugger.remote-mode'
  ? ( value === true
    ? 'adb-devtools'
    : 'disabled'
    )
  : value
  );

const readValue = (key, value) =>
  ( key === 'debugger.remote-mode'
  ? ( value === 'adb-devtools'
    ? true
    : false
    )
  : value
  );

export const Toggle/*:Action*/ =
  { type: "Toggle"
  };

export const Restart/*:Action*/ =
  { type: "Restart"
  };

const Report = result =>
  ( { type: "Report"
    , result: result
    }
  );

export const CleanRestart/*:Action*/ =
  { type: "CleanRestart"
  };

export const CleanReload/*:Action*/ =
  { type: "CleanReload"
  };

const Change = (name, value) =>
  ( { type: "Change"
    , name
    , value
    }
  );

const NoOP = () =>
  ( { type: "NoOp"
    }
  );

const SettingsAction = action =>
  ( { type: 'Settings'
    , action
    }
  );

const updateSettings = cursor
  ( { get: model => model.settings
    , set: (model, settings) => merge(model, {settings})
    , tag: SettingsAction
    , update: Settings.update
    }
  );

const toggle = model =>
  [ merge(model, {isActive: !model.isActive})
  , Effects.none
  ];

const restart = model =>
  [ model
  , Effects
    .perform(Runtime.restart)
    .map(Report)
  ];

const cleanRestart = model =>
  [ model
  , Effects
    .perform(Runtime.cleanRestart)
    .map(Report)
  ];

const cleanReload = model =>
  [ model
  , Effects
    .perform(Runtime.cleanReload)
    .map(Report)
  ];

const changeSetting = (model, {name, value}) =>
  [ model
  , Effects
    .perform(Settings.change({[name]: value}))
    .map(Settings.Changed)
    .map(SettingsAction)
  ];


const report =
  (model/*:Model*/, result/*:Result<any, any>*/)/*:[Model, Effects<Action>]*/ =>
  [ model
  , ( result.isOk
    ? Effects.none
    : Effects
      .perform(Unknown.error(result.error))
      .map(NoOP)
    )
  ];


export const init =
  ({isActive}/*:{isActive:boolean}*/)/*:[Model, Effects<Action>]*/ => {
  const [settings, fx] =
    Settings.init(Object.keys(descriptions));

  const result =
    [ { isActive
      , settings
      }
    , fx.map(SettingsAction)
    ];

  return result;
};



export const update =
  (model/*:Model*/, action/*:Action*/)/*:[Model, Effects<Action>]*/ =>
  ( action.type === 'Toggle'
  ? toggle(model)

  // Button actions
  : action.type === 'Restart'
  ? restart(model)
  : action.type === 'CleanRestart'
  ? cleanRestart(model)
  : action.type === 'CleanReload'
  ? cleanReload(model)
  : action.type === 'Report'
  ? report(model, action.result)

  : action.type === 'Change'
  ? changeSetting(model, action)

  : action.type === 'Settings'
  ? updateSettings(model, action.action)

  : Unknown.update(model, action)
  );




const styleSheet = StyleSheet.create
  ( { checkbox:
      { marginRight: '6px'
      , MozAppearance: 'checkbox'
      }
    , label:
      { padding: '6px'
      , MozUserSelect: 'none'
      , display: 'block'
      }
    , button:
      { display: 'block'
      , border: '1px solid #AAA'
      , padding: '3px 6px'
      , margin: '6px'
      , borderRadius: '3px'
      }
    , toolbox:
      { padding: '10px'
      , position: 'absolute'
      , bottom: '10px'
      , left: '10px'
      , width: '300px'
      , height: '400px'
      , color: 'black'
      , backgroundColor: 'white'
      , border: '2px solid #F06'
      , overflow: 'scroll'
      , zIndex: 3
      }
    , initializing:
      { display: 'none'
      }
    , hidden:
      { display: 'none'
      }
    , visible:
      { display: 'block'
      }
    }
  );

const viewSetting = (key, value, address) => {
  const isChecked = readValue(key, value);

  return html.label({
    key: key,
    style: styleSheet.label,
  }, [
    html.input({
      type: 'checkbox',
      checked: isChecked,
      style: styleSheet.checkbox,
      onChange: forward(address, () => Change(key, writeValue(key, !isChecked)))
    }),
    descriptions[key]
  ]);
};

const viewSettings = (settings, address) =>
  html.div({
    key: 'devtools-settings',
    className: 'devtools settings',
  }, Object.keys(settings || {})
           .map(key => thunk(key, viewSetting, key, settings[key], address)))

export const view =
  (model/*:Model*/, address/*:Address<Action>*/)/*:DOM*/ =>
  html.div({
    className: 'devtools toolbox',
    key: 'devtools-toolbox',
    style: Style
            ( styleSheet.toolbox,

              ( model.isActive
              ? styleSheet.visible
              : styleSheet.hidden
              )
            )
  }, [
    ( model.settings == null
    ? html.div({}, ['Initializing'])
    : thunk('settings', viewSettings, model.settings, address)
    ),
    html.button({
      style: styleSheet.button,
      onClick: forward(address, always(Restart))
    }, ['Restart']),
    html.button({
      style: styleSheet.button,
      onClick: forward(address, always(CleanRestart))
    }, ['Clear cache and restart']),
    html.button({
      style: styleSheet.button,
      onClick: forward(address, always(CleanReload))
    }, ['Clear cache and reload'])
  ]);
