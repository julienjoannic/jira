AJS.$(document).ready(function($){
	JIRA.bind(JIRA.Events.NEW_CONTENT_ADDED, function (e,context) {
		configureMultiSelect();
    });
	
	function configureMultiSelect() {
		new AJS.MultiSelect({
			element: AJS.$("#customfield_11483"),
			itemAttrDisplayed: "label",
			errorMessage: AJS.params.multiselectComponentsError
		});
	}
	
	configureMultiSelect();
});