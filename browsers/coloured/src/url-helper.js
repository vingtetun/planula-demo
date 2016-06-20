/* this source code form is subject to the terms of the mozilla public
 * license, v. 2.0. if a copy of the mpl was not distributed with this
 * file, you can obtain one at http://mozilla.org/mpl/2.0/. */

'use strict';

const nullURL = {
  origin: null,
  hostname: null,
  protocol: null
}

const parse = input => {
  try {
    return new URL(input);
  } catch(_) {
    return nullURL;
  }
}

const hasScheme = input => !!(rscheme.exec(input) || [])[0];
const getOrigin = url => parse(url).origin;
const getBaseURI = () => new URL('./', location);
const getHostname = url => parse(url).hostname;
const getDomainName = url =>
  (getHostname(url) || '').replace(/^www\./, '');
const getProtocol = url => parse(url).protocol;
const getManifestURL = () => new URL('./manifest.webapp', getBaseURI());

const isAboutURL = url =>
  parse(url).protocol === 'about:';

const isPrivileged = uri => {
  // FIXME: not safe. White list?
  return uri && uri.startsWith(new URL('./src/about/', getBaseURI()));
};

const rscheme = /^(?:[a-z\u00a1-\uffff0-9-+]+)(?::|:\/\/)/i;
const isNotURL = input => {
  var str = input.trim();

  // for cases, ?abc and 'a? b' which should searching query
  const case1Reg = /^(\?)|(\?.+\s)/;
  // for cases, pure string
  const case2Reg = /[\?\.\s\:]/;
  // for cases, data:uri
  const case3Reg = /^\w+\:\/*$/;
  if (str == 'localhost') {
    return false;
  }
  if (case1Reg.test(str) || !case2Reg.test(str) || case3Reg.test(str)) {
    return true;
  }
  if (!hasScheme(input)) {
    str = 'http://' + str;
  }
  try {
    new URL(str);
    return false;
  } catch (e) {
    return true;
  }
}

const readSearchURL = input =>
  `https://www.bing.com/search?q=${encodeURIComponent(input)}`;

const readAboutURL = input =>
  input === 'about:blank' ? input :
  `${getBaseURI()}src/about/${input.replace('about:', '')}/index.html`;

const read = input =>
  isNotURL(input) ? readSearchURL(input) :
  !hasScheme(input) ? `http://${input}` :
  input;

const resolve = uri =>
  isAboutURL(uri) ? readAboutURL(uri) :
  uri;

const aboutPattern = /\/about\/([^\/]+)\/index.html$/;

const readAboutTerm = input => {
  const match = aboutPattern.exec(input);
  return match != null ? match[1] : null;
}

const asAboutURI = uri => {
  const base = getBaseURI();
  const {origin, pathname} = new URI(uri);
  const about = base.origin === origin ? readAboutTerm(pathname) : null;
  return about != null ? `about:${about}` : null;
}

exports.parse = parse;
exports.resolve = resolve;
exports.asAboutURI = asAboutURI;
exports.read = read;
exports.hasScheme = hasScheme;
exports.getOrigin = getOrigin;
exports.getBaseURI = getBaseURI;
exports.getHostname = getHostname;
exports.getDomainName = getDomainName;
exports.getProtocol = getProtocol;
exports.getManifestURL = getManifestURL;
exports.isAboutURL = isAboutURL;
exports.isPrivileged = isPrivileged;
exports.isNotURL = isNotURL;
