function getUrlVar(param)
{
  var vars = {}, hash;
  var hashes = window.location.search.slice(1).split('&');
  for(var i = 0; i < hashes.length; i++)
  {
    hash = hashes[i].split('=');
    vars[hash[0]] = hash[1];
  }

  if (param !== undefined){
    if (vars[param] !== undefined){
      return vars[param];
    } else {
      return null;
    }
  } else {
    return vars;
  }
}


function removeUrlVar(param) {
  //prefer to use l.search if you have a location/link object
  var urlparts= window.location.search.split('?');
  if (urlparts.length>=2) {
    var prefix= encodeURIComponent(param)+'=';
    var pars= urlparts[1].split(/[&;]/g);

    //reverse iteration as may be destructive
    for (var i= pars.length; i-- > 0;) {
        //idiom for string.startsWith
        if (pars[i].lastIndexOf(prefix, 0) !== -1) {
            pars.splice(i, 1);
        }
      }

      window.location.search= urlparts[0] + (pars.length > 0 ? '?' + pars.join('&') : "");
  }
}


function createCookie(name,value,days) {
  if (days) {
    var date = new Date();
    date.setTime(date.getTime()+(days*24*60*60*1000));
    var expires = "; expires="+date.toGMTString();
  }
  else var expires = "";
  document.cookie = name+"="+value+expires+"; path=/";
}


function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0)==' ') c = c.substring(1,c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

function eraseCookie(name) {
  createCookie(name,"",-1);
}

function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
    return String.fromCharCode('0x' + p1);
  }));
}

function b64DecodeUnicode(str) {
  return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}
