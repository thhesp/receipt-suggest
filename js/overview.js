$( document ).ready(function() {
	loadRecipes();
});

function loadRecipes(){
	jQuery("#recipes-container").empty();
	jQuery.get({
        type: "GET",
        url: "data/recipes.csv",
        dataType: "text",
        success: function(data) {
        	console.log(data);
        	var recipes = jQuery.csv.toObjects(data);

			createRecipesOverview(recipes);
            createTagsSelector(recipes);
        },
        error: function(xhr, ajaxOptions, thrownError) {
	  	  	console.log(xhr.status);
        	console.log(thrownError);
	  }
     });


}

function createRecipesOverview(recipes){
    for(var i = 0; i < recipes.length; i++){
        var template = _.template($("#recipe-template").html());
        jQuery("#recipes-container").append(template(transformData(recipes[i])));
    }
}

function createTagsSelector(recipes){
    var allTags = new Set();
    for(var i = 0; i < recipes.length; i++){
       console.log(recipes[i], normalizeTags(recipes[i]['Tags']));
       normalizeTags(recipes[i]['Tags']).forEach(el => allTags.add(el));
    }

    console.log("All Tags ", allTags);

    var templateObj = {"tags": Array.from(allTags).sort()};
    console.log("For Template ", templateObj);

    var template = _.template($("#tags-selector-template").html());
    jQuery("#tags-container").append(template(templateObj));

    jQuery("#tags-container .btn-tag-sel").on("click", toggleTag);
}

function toggleTag(){
    var toggledTag =  jQuery(this).attr("tagVal");
    console.log("toggleTag ", toggledTag);

    var alreadyActiveTags = $("#tags-container .btn-tag-sel.active").map(function () {
                                return $(this).attr("tagVal");
                            }).get()

    if(jQuery(this).hasClass("active")){
        var finalTags = alreadyActiveTags.filter(e => e !== toggledTag);
        console.log("deactivate ", finalTags);
        showTags(finalTags);
        disableTags(finalTags);
    } else {
        alreadyActiveTags.push(toggledTag);
        console.log("activate ", alreadyActiveTags);
        showTags(alreadyActiveTags);
        disableTags(alreadyActiveTags);
    }
}

function showTags(tags){
    var tagString = formatTagString(tags);
    console.log("Searching for tags ", tagString);
    jQuery("#recipes-container .card").show();

    if(tagString){
        jQuery("#recipes-container .card").not(tagString).hide();
    }
}

function formatTagString(tags) {
    return tags.map( el => ".tag-"+el).join("");
}

function disableTags(activeTags){
    var tagString = formatTagString(activeTags);
    console.log("Disabling Tags ", tagString);
    if(tagString){
        jQuery("#tags-container .btn-tag-sel").prop('disabled', true);
        // enable possible filter
        var possibleFilter = determinePossibleFilter(tagString);
        console.log("possible Filters: ", possibleFilter);
        possibleFilter.forEach(el => jQuery("#tags-container .btn-tag-sel."+el).prop('disabled', false));
    } else {
        jQuery("#tags-container .btn-tag-sel").prop('disabled', false);
    }
}

function determinePossibleFilter(tagString){
    var setOfFilters = new Set(jQuery("#recipes-container .card"+tagString).map(function () {
                                                     return $(this).attr("class").split(' ').filter(el => el.startsWith("tag-"));
                                                  }).get());

    return Array.from(setOfFilters);
}

function transformData(data){
	return {
		name:data['Name'],
		tags:data['Tags'] != undefined ? normalizeTags(data['Tags']):[],
		link: getLink(data)
	};
}

function normalizeTags(tags){
    if(tags == undefined || tags.trim() == ""){
        return [];
    }
    return tags.split(";").map(word => word.toUpperCase().trim()).filter(str => /\w+/.test(str));
}

function getLink(data){
	if(data.External === 'Y'){
		return data['Link'];
	}

	return "recipe.html?recipe="+data['Link']+"&name="+data['Name'];
}