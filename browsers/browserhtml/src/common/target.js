/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


import {Effects} from "reflex";
import {merge} from "../common/prelude";
import * as Unknown from "../common/unknown";

/*::
import type {Action, Model} from "./target"
*/

export const Over/*:Action*/ = {type: "Over"};
export const Out/*:Action*/ = {type: "Out"};

export const update = /*::<model:Model>*/
  (model/*:model*/, action/*:Action*/)/*:[model, Effects<Action>]*/ =>
  ( action.type == "Over"
  ? [merge(model, {isPointerOver: true}), Effects.none]
  : action.type == "Out"
  ? [merge(model, {isPointerOver: false}), Effects.none]
  : Unknown.update(model, action)
  );
