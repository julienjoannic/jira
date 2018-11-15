AJS.$(document).ready(function($){
	function configureMultiSelect(fieldId) {
		new AJS.MultiSelect({
			element: AJS.$("#" + fieldId),
			itemAttrDisplayed: "label",
			errorMessage: AJS.params.multiselectComponentsError
		});
	}
	
	function configureAllMultiSelects() {
		configureMultiSelect("customfield_11482");
		configureMultiSelect("customfield_11281");
		configureMultiSelect("customfield_11483");
	}
	
	function configureSelect2(fieldId) {
		var field = AJS.$(fieldId);
		if (field.auiSelect2) {
			field.auiSelect2({
				placeholder: "Composant SAP",
				minimumInputLength: 2,
				ajax: { // instead of writing the function to execute the request we use Select2's convenient helper
					url: "https://sm-comp.neo-technologies.ch/sap/neotech/jira/components",
					dataType: 'json',
					quietMillis: 250,
					data: function (term, page) {
						return {
							q: term, // search term
						};
					},
					results: function (data, page) { // parse the results into the format expected by Select2.
						// since we are using custom formatting functions we do not need to alter the remote JSON data
						return { results: data };
					},
					cache: true
				},
				initSelection: function(element, callback) {


				},
				formatResult: function(component) { return component.id + ' - ' + component.text }, 
				formatSelection: function(component) { return component.id }, 
				dropdownCssClass: "bigdrop", // apply css that makes the dropdown taller
				escapeMarkup: function (m) { return m; } // we do not want to escape markup since we are displaying html in results
			});
		}
	}
	
	function configureFields() {
		configureAllMultiSelects();
		
		if (window.location.href.indexOf("-dev") > -1) {
			configureSelect2("#customfield_11787");
		}
		else {
			configureSelect2("#customfield_11787");
		}
	}
	
	JIRA.bind(JIRA.Events.NEW_CONTENT_ADDED, function (e,context) {
		configureFields();
    });
	
	configureFields();
});
