(function ($) {
  if (!$.Plugin) {
    $.Plugin = new Object();
  }
  ;
  $.Plugin.Form = function (el, getData, options) {
    // To avoid scope issues, use 'base' instead of 'this'
    // to reference this class from internal events and functions.
    var base = this;
    // Access to jQuery and DOM versions of element
    base.$el = $(el);
    base.el = el;
    // Add a reverse reference to the DOM object
    base.$el.data("Plugin.Form", base);
    base.init = function () {
      base.getData = getData;
      base.options = $.extend({}, $.Plugin.Form.defaultOptions, options);
      base.render({
        display: base.options.display,
        formData: base.options.formData
      });

    };
    base.render = function (dataSend) {
      base.setFieldTypes();
      var aux = "";
      var aux2 = "";
      var obj = {};
      $.ajax({
        url: base.options.host + base.options.structure,
        method: "GET",
        success: function (data) {
          var subObj = "";
          obj = data['fields'];
          //Save default event Structure in default options.
          base.options.eventStructure = obj;
          $.each(obj, function (key) {
            if (obj[key]['type'] == 'optionList') {
              //Render if it's an optionList object (DropDown)
              subObj = base.getElementsObject(obj[key]);
              $.each(subObj, function (key2) {
                aux2 += base.createDropDownElement(subObj[key2]);
              });
              aux += base.createDropDownButton(obj[key],aux2);
            } else {
              //If it's a simple field or HTML data.
              aux += base.createInputType(obj[key]);
            }
            subObj = {};
            aux2 = "";
          });
          base.printModalOrContainer(aux);
          base.addListeners(obj);
          //Fill fields if the plugin has received an object.
          base.fillFields(dataSend.formData);
        },
        error: function () {
          toastr.error(base.options.connectionErrorMessage);
        }
      });


    };
    base.addListeners = function (obj) {
      //Set value in the dropdown's and change style.
      $('.listElement').on('click', function () {
        ($(this)).parent().parent().children('.DropdownButton').addClass('btn-success').text(($(this).text()));
        ($(this)).addClass('itemSelected');
      });
      //When 'add element' is pressed. Here comes validation:
      $('.sendElement').on('click', function () {
        //One array to store error Fields, and another one for good Fields.
        var errorFields = [];
        var okeyFields = [];
        var okeyData = [];
        $.each(obj, function (key) {
          //Tests Dropdowns
          if (obj[key]['type'] == 'optionList') {
            if ((($('#' + obj[key]['name']).text()).trim() == obj[key]['label'].trim()) && base.testRequired(obj[key])) {
              errorFields.push(obj[key]['name']);
            } else {
              okeyFields.push(obj[key]['name']);
              okeyData.push($('#' + obj[key]['name']).text());
            }
            //Tests the rest.
          } else {
            if($('#' + obj[key]['name']).val() == "" && base.testRequired(obj[key])) {
              errorFields.push(obj[key]['name']);
            } else {
              okeyFields.push(obj[key]['name']);
              okeyData.push($('#' + obj[key]['name']).val());
            }
          }
        });
        //Check if there are mistakes with validations. (One method for each possibility)
        if (errorFields[0] != undefined) {
          base.badValidation(errorFields);
        } else {
          base.goodValidation(okeyFields, okeyData);
        }

      });
      //Delete all data of the plugin from DOM tree.
      $('.discardButton').on('click', function () {
        el.empty();
      });
      //Allows destroying the modal, if there is a click outside it. (Toastr are in mind)
      if (base.options.display == 'modal') {
        $(document).mouseup(function (e) {
          var container = $('.modal-dialog');
          var toastr = $('.toastr');
          if ((!container.is(e.target)) &&
            (container.has(e.target).length === 0) &&
            (!toastr.is(e.target)) &&
            (toastr.has(e.target).length === 0)) {
            el.empty();
          }
        });
      }
    };

    //Save all fields types in default options
    base.setFieldTypes = function () {
      $.ajax({
        url: base.options.host + "getFieldTypes",
        async: false,
        success: function (data) {
          base.options.fieldEditors = data;
        }
      });
    };
    //Renders code into modal or Container
    base.printModalOrContainer = function (aux) {
      if (base.options.display == "modal") {
        base.el.html(base.options.modalStructure(aux));
      } else {
        base.el.html(base.options.containerStructure(aux));
      }
    };
    //Creates dropDown Button
    base.createDropDownElement = function (name) {
      return base.options.form.dropDownElement(name, name);
    };
    //Creates several elements for the Button
    base.createDropDownButton = function (obj, aux2) {
      var button = base.options.form.dropDownButton(obj['name'], obj['label'], aux2);
      var label = base.options.form.label(obj['label']);
      return base.options.form.inputRow(label,button);
    };
    //Creates a default input (with type specified and hidden too)
    base.createInputType = function (obj) {
      //TODO @bbenejam Improve type getter
      var validate = "";
      var mayHidden = "";
      var form = base.options.form;
      var label = form.label(obj['label']);
      var input = "";
      var type = obj['type'];
      if (base.testRequired(obj)) {
        validate = "required";
      }
      if(obj['type'] == 'hidden'){
        mayHidden = "hidden";
      }

      if(obj['type'] == 'html'){
        return form.inputRow(label,form.htmlInput(obj['name']),validate);
      }else {
        input = form.input(obj['name'], type, validate);
        return form.inputRow(label, input, mayHidden);
      }
    };
    base.badValidation = function (errorFields) {
      var errorHtml = "";
      $.each(errorFields, function (key) {
        errorHtml += base.options.error.listElement.format(errorFields[key]);
      });
      errorHtml = base.options.error.list.format(errorHtml);
      toastr.error(errorHtml, 'Some Fields aren\'t OK:');
    };
    base.goodValidation = function (goodFields, goodData) {
      var result = {};
      $.each(goodFields, function (key) {
        if (goodData[key] == "") {
          result[goodFields[key]] = null;
        } else {
          result[goodFields[key]] = goodData[key];
        }
      });

      toastr.success('Element added successfully!');
      el.empty();
    };
    //Get json from URI
    base.getElementsObject = function (obj) {
      var obj2 = {};
      $.ajax({
        url: base.options.host + obj['uriData'],
        async: false,
        success: function (data2) {
          obj2 = data2;
        }
      });
      return obj2;
    };
    //Tests if object is required
    base.testRequired = function (obj) {
      return obj['validation'] == 'required';
    };

    base.validateField = function (value, bool) {
      if (bool) {
        value = value.replace(/([a-z])([A-Z])/g, '$1 $2')
      }
      if (typeof(value) == 'string') {
        var value2;
        if (value.charAt(0).toLowerCase()) {
          value2 = value.toLowerCase().replace(/\b[a-z]/g, function (letter) {
            return letter.toUpperCase();
          });
        } else {
          value2 = value;
        }
        return value2;
      } else {
        return null;
      }
    };
    //Fills Fields
    base.fillFields = function (objectSent) {
      var inputs = base.options.eventStructure;
      $.each(inputs, function (key, value) {
        if (inputs[key]['type'] == 'optionList') {
          if (objectSent[inputs[key]['name']] != null) {
            $('#' + inputs[key]['name']).addClass('btn-success').text(objectSent[inputs[key]['name']]);
          }
        } else if (inputs[key]['type'] == 'html') {
          $('#'+ inputs[key]['name']).val(objectSent[inputs[key]['name']]);
        } else {
          $('#' + inputs[key]['name']).val(objectSent[inputs[key]['name']]);
        }
      });
    };
    base.init();
  };
  String.prototype.format = function () {
    var args = arguments;
    return this.replace(/\{\{|\}\}|\{(\d+)\}/g, function (curlyBrack, index) {
      return ((curlyBrack == "{{") ? "{" : ((curlyBrack == "}}") ? "}" : args[index]));
    });
  };

  $.Plugin.Form.defaultOptions = {
    display: "modal",
    defaultTitle: "Add Element",
    host: "http://tomcat7-mycoachgate.rhcloud.com/rest/",
    structure: "events/structure",
    formData: "Hello",
    connectionErrorMessage: "Can't connect to Rest Service",
    containerStructure: function (htmlData) {
      return "{0}<div class='text-right' style='margin-top:10px;'><button type='button' class='btn btn-default discardButton' data-dismiss='modal'>Discard</button> <button type='button' class='btn btn-primary sendElement'>Add Element</button></div>".format(htmlData);
    },
    modalStructure: function (htmlData) {
      return "<div class='modal fade in' id='myModal' tabindex='-1' role='dialog' aria-labelledby='myModalLabel' style='display: block;'><div class='modal-dialog' role='document'><div class='modal-content FormModalContent'> <div class='modal-header FormModalHeader'> <button type='button' class='close' data-dismiss='modal' aria-label='Close'><span aria-hidden='true'>&times;</span></button> <h4 class='modal-title' id='myModalLabel'>Add Element</h4> </div> <div class='modal-body'>{0}</div><div class='modal-footer'> <button type='button' class='btn btn-default discardButton' data-dismiss='modal'>Discard</button> <button type='button' class='btn btn-primary sendElement'>Add Element</button> </div> </div> </div> </div>".format(htmlData)
    },
    form: {
      label: function(labelName){return "<div class='fieldLabel'>{0}</div>".format(labelName);},
      input: function(id,type,required){return "<input type='{1}' id='{0}' class='form-control input-circle-right input-right {2}'>".format(id,type,required)},
      htmlInput: function (id,required) {
        return "<textarea id='{0}' class='form-control input-right textareaStyle {1}' rows='5'></textarea>".format(id,required);
      },
      inputRow: function(label, input, optionalHidden){return "<div class='row inputRow {2}'>{0}{1}</div>".format(label,input,optionalHidden);},
      dropDownButton: function(id, buttonName, elementsHtml){return "<div class='dropdown input-right'><button class='btn dropdown-toggle sr-only DropdownButton' type='button' id='{0}' data-toggle='dropdown'>{1} <span class='caret'></span> </button> <ul class='dropdown-menu DropDownUL scrollable-menu' role='menu' aria-labelledby='dropdownMenu1'>{2}</ul></div>".format(id, buttonName, elementsHtml);},
      dropDownElement: function (id, itemName) {
        return "<li role='presentation' id='{0}' class='listElement'><a role='menuitem' tabindex='-1' href='#'>{1}</a> </li>".format(id, itemName);
      }
    },
    error: {
      list: "<ul>{0}</ul>",
      listElement: "<li>{0}</li>"
    },
    fieldEditors: {},
    data: {},
    eventStructure: {}
  };
  $.fn.Plugin_Form = function (getData, options) {
    return this.each(function () {
      (new $.Plugin.Form(this, getData, options));
    });
  };
  // This function breaks the chain, but returns
  // the myCorp.MyExample if it has been attached to the object.
  $.fn.getPlugin_Form = function () {
    this.data("Plugin.Form");
  };
})(jQuery);
