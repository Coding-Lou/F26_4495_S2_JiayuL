/*
 * Outdoor Trip Companion: focus on the registration page (FEATURE-002 D29).
 *
 * The parent theme focuses the first field of the sign-in page but not of the
 * registration page, and after a failed submit it leaves focus at the top of
 * the document. This script puts focus on the first field when the
 * registration page loads, and on the first invalid field when the page comes
 * back with errors.
 *
 * The theme loads this file on every page of the login flow. It acts only
 * where the registration form exists and returns everywhere else, so the
 * sign-in page keeps the focus the parent gives it.
 *
 * It runs once. It makes no request, reads no field value, stores nothing,
 * and logs nothing. An invalid field is recognised by aria-invalid="true",
 * which the parent writes on the input itself.
 */
(function () {
  "use strict"

  var FIELDS =
    "input:not([type='hidden']):not([type='submit']), select, textarea"

  function focusRegistrationField() {
    var form = document.getElementById("kc-register-form")
    if (!form) {
      return
    }

    // Never take focus from an element that already has it.
    var active = document.activeElement
    if (active && active !== document.body && active !== document.documentElement) {
      return
    }

    var fields = form.querySelectorAll(FIELDS)
    var first = null
    var firstInvalid = null

    for (var i = 0; i < fields.length; i += 1) {
      var field = fields[i]
      if (field.disabled) {
        continue
      }
      if (first === null) {
        first = field
      }
      if (field.getAttribute("aria-invalid") === "true") {
        firstInvalid = field
        break
      }
    }

    var target = firstInvalid || first
    if (target) {
      target.focus()
    }
  }

  // The file is loaded in the document head, before the form exists.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", focusRegistrationField, {
      once: true,
    })
  } else {
    focusRegistrationField()
  }
})()
