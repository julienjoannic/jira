AJS.$(document).ready(function($){
	JIRA.bind(JIRA.Events.NEW_CONTENT_ADDED, function (e,context) {
		configureAllMultiSelects();
    });
	
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
	
	configureAllMultiSelects();
});