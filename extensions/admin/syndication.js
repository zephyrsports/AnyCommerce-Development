/* **************************************************************

   Copyright 2013 Zoovy, Inc.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

************************************************************** */


var admin_syndication = function() {
	var theseTemplates = new Array(
	'pageSyndicationTemplate',
	'syndicationDetailTemplate',
	'syndicationFilesRowTemplate'
	//all the DST specific templates are intentionally NOT included here. They'll get loaded as needed.
	);
	var r = {
	
	vars : {
		ebayXSL : null
		},

////////////////////////////////////   CALLBACKS    \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\



	callbacks : {
//executed when extension is loaded. should include any validation that needs to occur.
		init : {
			onSuccess : function()	{
				var r = false; //return false if extension won't load for some reason (account config, dependencies, etc).
//the list of templates in theseTemplate intentionally has a lot of the templates left off.  This was done intentionally to keep the memory footprint low. They'll get loaded on the fly if/when they are needed.
				app.model.fetchNLoadTemplates(app.vars.baseURL+'extensions/admin/syndication.html',theseTemplates);
				
				var ebayxsl = $.ajax(app.vars.baseURL+'extensions/admin/resources/syi_attributes.xsl',{
					success : function(data,b,c)	{
						app.ext.admin_syndication.vars.ebayXSL = c.responseText;
						},
					error : function(a,b,c)	{
						$('#globalMessaging').anymessage(app.u.errMsgObject('An error occured while trying to load a resource file. The eBay category chooser is not likely to work properly during this session. If you need this feature, please refresh your browser. If the error persists, please contact technical support.'))
						app.u.dump("An error occured loading the XSL file to ebay store categories. eBay category chooser will NOT work properly. error details:",'error');
						app.u.dump(a);
						app.u.dump(b);
						app.u.dump(c);
						}
					})
				r = true;

				return r;
				},
			onError : function()	{
//errors will get reported for this callback as part of the extensions loading.  This is here for extra error handling purposes.
//you may or may not need it.
				app.u.dump('BEGIN admin_orders.callbacks.init.onError');
				}
			}, //init
//when this macro response syntax gets adopted elsewhere, move this to admin extension.
// this was not the method that got implemented. processForm was.
		handleMacroUpdate : {
			onSuccess : function(_rtag)	{
				app.u.dump("BEGIN admin_syndication.callbacks.handleMacroUpdate.onSuccess");
				app.u.dump(" -> typeof _rtag.jqObj: "+typeof _rtag.jqObj);
				var $target;
				if(_rtag && _rtag.jqObj && typeof _rtag.jqObj === 'object')	{
					$target = _rtag.jqObj
					$target.hideLoading();
					app.u.handleAppEvents($target);  //re-execute these so that changes to the marketplace lock/unlock buttons as needed.
					}
				else	{
					$target = $('#globalMessaging');
					}
				
				$target.anymessage(app.u.successMsgObject('Your changes have been saved'))

//if everything was successful, revert the form to a pre-change state.
				$("[data-app-role='saveButton']",$target).button('disable').find('.numChanges').text(""); //make save buttons not clickable.
				$('.edited',$target).removeClass('edited'); //revert inputs to non-changed state.

				
				},
			onError : function(rd)	{
				app.u.dump("BEGIN admin_syndication.callbacks.handleMacroUpdate.onError");
				var $target;
				if(rd && rd._rtag && rd._rtag.jqObj && typeof rd._rtag.jqObj=== 'object')	{
					$target = rd._rtag.jqObj;
					$target.hideLoading();
					}
				else	{
					$target = $('#globalMessaging');
					}
				$target.anymessage({'message':rd})
				}
			},

//ebay requires a registration process. Until that's done, the ebay setup page is not displayed and a register template is displayed instead.
		handleEBAY : {
			onSuccess : function(_rtag)	{
//				app.u.dump("BEGIN callbacks.anycontent");

				if(_rtag && _rtag.jqObj && typeof _rtag.jqObj == 'object')	{
					if(app.data[_rtag.datapointer].enable)	{
						app.ext.admin_syndication.callbacks.anycontentPlus.onSuccess(_rtag); //this is how all the other marketplaces (which don't require auth) are handled.
						}
					else	{
						_rtag.jqObj.hideLoading();
						_rtag.jqObj.anycontent({'templateID':'syndication_register_ebf','showLoading':false});
						app.u.handleAppEvents(_rtag.jqObj);
						}
					}
				else	{
					$('#globalMessaging').anymessage({'message':'In admin.callbacks.anycontent, jqOjb not set or not an object ['+typeof _rtag.jqObj+'].','gMessage':true});
					}


				
				}
			},
		anycontentPlus : {
			onSuccess : function(_rtag)	{
//				app.u.dump("BEGIN callbacks.anycontent");

				if(_rtag && _rtag.jqObj && typeof _rtag.jqObj == 'object')	{
					
					var $target = _rtag.jqObj; //shortcut
//need both the data in the response and the wholesaleScheduleList for 'settings' page.
					$target.anycontent({data: $.extend(true,{},app.data[_rtag.datapointer],app.data.adminWholesaleScheduleList),'templateID':_rtag.templateID});

					$('.toolTip',$target).tooltip();
					$(':checkbox.applyAnycb',$target).anycb();
					$('table.applyAnytable',$target).anytable();
					$('.applyAnytabs',$target).anytabs();

					app.u.handleAppEvents($target);

					if(_rtag.applyEditTrackingToInputs)	{
						app.ext.admin.u.applyEditTrackingToInputs($target);
						}
					}
				else	{
					$('#globalMessaging').anymessage({'message':'In admin.callbacks.anycontent, jqOjb not set or not an object ['+typeof _rtag.jqObj+'].','gMessage':true});
					}


				
				},
			onError : function(rd)	{
				if(rd._rtag && rd._rtag.jqObj && typeof rd._rtag.jqObj == 'object'){
					rd._rtag.jqObj.hideLoading().anymessage({'message':rd});
					}
				else	{
					$('#globalMessage').anymessage({'message':rd});
					}
				}
			} //anycontentPlus


		}, //callbacks



////////////////////////////////////   ACTION    \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


		a : {
//opens the ebay category chooser in a modal.  
//$input is a jquery object of an input where the category value selected will be set using val();
//vars is an object that needs to contain a pid and a categoryselect.
//eBay allows for a primary and secondary category to be set, however attributes are only set on the primary, so that mode is important.
//var keys are all lower case to allow for easy set via 'data' and consistency.
//$path is an optional param which, if set, will have the path of the selected category set.
			showEBAYCategoryChooserInModal : function($input,vars,$path)	{
				app.u.dump("BEGIN admin_syndication.a.showEBAYCategoryChooserInModal");
				vars = vars || {};
				if($input && $input instanceof jQuery)	{
					if(vars.pid && vars.categoryselect == 'primary' || vars.categoryselect == 'secondary')	{
						vars.inputid = null;
						
						var $D = $('#ebayCategoryChooser');
						if($D.length)	{
							$("[data-app-role='ebayCategoryChooserXSLContainer']",$D).empty(); //remove old content.
							$("[data-app-role='ebayCategoryChooserItemSpecificsFieldset']",$D).find(".inputContainer").empty().remove();
							$("[data-app-role='ebayCategoryList']",$D).empty(); //clear categories. they get re-fetched if it's a new product and if not, they'll be in memory.
							$D.removeData('categoryselect inputid pathid pid categoryid'); //clear old values from previous product/category selection
							}
						else	{
							$D = $("<div \/>",{'title':'eBay Category Chooser','id':'ebayCategoryChooser'});
							$D.dialog({
								'modal':true,
								'width' : '90%',
								'height':($(window).height() - 100),
								'autoOpen' : false
								});
							$D.anycontent({
								'templateID' : 'ebayCategoryChooserTemplate',
								'showLoadingMessage' : 'Fetching eBay category list'
								});
							}

//if one doesn't already exist, add an id to both the input and path elements.  The ID's are used to look up the elements later.
						$D.dialog('open');
						if(vars.inputid = $input.attr('id'))	{} //value for input id is set in if.
						else	{
							vars.inputid = 'ebaycat_'+app.u.guidGenerator();
							$input.attr('id',vars.inputid)
							}

						if($path)	{
							if(vars.pathid = $path.attr('id'))	{} //value for input id is set in if.
							else	{
								vars.pathid = 'span_'+app.u.guidGenerator();
								$input.attr('id',vars.pathid)
								}
							}

//						app.u.dump(" -> vars: "); app.u.dump(vars);
						$D.data(vars); //set on dialog so they can be easily located later (on save).
//						app.u.dump(" -> $D.data():"); app.u.dump($D.data());
						app.ext.admin.calls.adminEBAYCategory.init({'categoryid':'0','pid':vars.pid},{'callback':function(rd){
							app.u.dump("BEGIN callback for adminEBAYCategory catid 0 and pid: "+vars.pid);
							$D.hideLoading();
							if(app.model.responseHasErrors(rd)){
								$D.anymessage({'message':rd})
								}
							else	{
								if($input.val())	{
									app.ext.admin_syndication.u.ebayShowTreeByChild($input.val());
									}
								$("[data-app-role='ebayCategoryChooserTable']",$D).anycontent(rd);
							//	app.u.dump(" -> item specifics: "+app.data[rd.datapointer]['ebay:itemspecifics']);
								if(app.data[rd.datapointer]['ebay:itemspecifics'])	{
									var
										rows = app.data[rd.datapointer]['ebay:itemspecifics'].split("\n"),
										L = (rows.length - 1),
										$o = $("<div \/>"); //each row is appended to this and then the children are added to the fieldset
							
									for(var i = 0; i < L; i += 1)	{
										var kvp = rows[i].split(/:(.+)?/);
							//skip blanks.
										if(kvp[0])	{
											$o.append("<div class='inputContainer marginTop'><input type='text' placeholder='Detail Title' value='"+kvp[0]+"' name='cs_name"+i+"' class='marginRight' \/><input type='text' placeholder='Detail Value' value='"+kvp[1]+"' name='cs_value"+i+"' \/><\/div>");
											}
										}
									$("[data-app-role='ebayCategoryChooserItemSpecificsFieldset']",$D).prepend($o.children()); //prepend so they appear before button.
									}
								}
							}},'mutable');
						app.model.dispatchThis('mutable');
						}
					else	{
						$('#globalMessaging').anymessage({"message":"In admin.a.showEBAYCategoryChooserInModal, categorySelect ["+vars.categorySelect+"] was set to an invalid value or no pid ["+vars.pid+"] was passed. categoryselect must be primary or secondary.","gMessage":true});
						}
					}
				else	{
					$('#globalMessaging').anymessage({"message":"In admin.a.showEBAYCategoryChooserInModal, $input was either not passed or does not exist on the dom","gMessage":true});
					}
				},

			showSyndication : function($target)	{
				app.ext.admin.calls.adminWholesaleScheduleList.init({},'passive'); //most syndication 'settings' use this. have it handy
				app.model.dispatchThis('passive');

				$target.empty();
				$target.anycontent({'templateID':'pageSyndicationTemplate',data:{}});
				$("[data-app-role='slimLeftNav']",$target).first().accordion();
				app.u.handleAppEvents($target);


				
				app.ext.admin_reports.u.getChartData($("#syndicationSummaryChartOne",$target).show().addClass("graphType_pie"),{"function":"sum","graph":"pie","period":"days.7","grpby":"none","dataColumns":"dynamic","column":"gms","ddataset":"MARKETS","datasetGrp":"","title":"7 Day Gross Sales Summary by Integrations","collection":"collection/graph location","@datasets":["MARKETS"],"_cmd":"adminKPIDBDataQuery"});
				app.model.dispatchThis('mutable');


				}, //showSyndication

			showAmzRegisterModal : function(){
				var $D = $("<div \/>").attr('title',"Approve Amazon Create/Verify your MWS Token").append("<p><b>Welcome back!<\/b>. To complete this process, please push the 'complete activation' button below.<\/p><p class='hint'>You were given this notice because we detected you just returned from Amazon to Create/Verify your MWS Token. If you are not returning directly from Amazon, please do not push the complete activation button..<\/p>");
				$D.dialog({
					modal: true,
					width: ($('body').width() > 400) ? 400 : '90%',
					autoOpen: false,
					close: function(event, ui)	{
						$(this).dialog('destroy').remove();
						},
					buttons: [ 
						{text: 'Cancel', click: function(){
							$D.dialog('close');
							}},
						{text: 'Complete Activation', click: function(){
							if(window.location.href.indexOf('?') > 0)	{
								var uriParams = app.u.kvp2Array(window.location.href.split('?')[1]);
								app.ext.admin.calls.adminSyndicationMacro.init("AMZ",["AMZ-TOKEN-UPDATE?marketplaceId="+uriParams.marketplaceId+"&merchantId="+uriParams.merchantId+"&amazon-token="+uriParams['amazon-token']],{'callback':function(rd){
									if(app.model.responseHasErrors(rd)){
										$D.anymessage({'message':rd})
										}
									else	{
										$D.empty().anymessage(app.u.successMsgObject('Activation successful!'));
										$D.dialog({ buttons: [ { text: "Close", click: function() { $( this ).dialog( "close" ); } } ] });
										}
									}},'immutable');
								app.model.dispatchThis('immutable');
								}
							else	{
								$D.anymessage({"message":"URL contains no question mark with params. expecting marketplaceId and merchantId.",'gMessage':true});
								}
							}}	
						]
					});
//					$(':checkbox',$D).anycb(); //{'text' : {'on' : 'yes','off':'no'}} //not working in a dialog for some reason.
				$D.dialog('open');
				}, //showAmzRegisterModal


			showEBAY : function($target)	{
$target.empty().showLoading({'message':'Fetching eBay data'});

var
	$slimLeftContent = $target.closest("[data-app-role='slimLeftContentSection']"),
	$extrasTab = $("[data-app-role='extrasTab']",$slimLeftContent),
	$extrasTabContent = $("[data-anytab-content='extras']",$slimLeftContent);
	

$extrasTab.show().find('a').text('Tokens & Profiles');

//ebayTokensAndProfilesTemplate
//ebay takes a very different path at this point.  
//go get 
app.ext.admin.calls.adminSyndicationDetail.init('EBF',{},'mutable');
app.model.addDispatchToQ({'_cmd':'adminEBAYProfileList','_tag': {'datapointer':'adminEBAYProfileList'}},'mutable');
app.model.addDispatchToQ({'_cmd':'adminEBAYTemplateList','_tag': {'datapointer':'adminEBAYTemplateList'}},'mutable');
app.model.addDispatchToQ({'_cmd':'adminEBAYTokenList','_tag': {'datapointer':'adminEBAYTokenList','callback' : function(rd){
	$target.hideLoading();
	if(app.model.responseHasErrors(rd)){
		$target.anymessage({'message':rd})
		}
	else	{
		if(app.data[rd.datapointer]['@ACCOUNTS'].length)	{
//populate syndication tab
			$target.anycontent({
				'templateID':'syndication_ebf',
				'data' : app.data['adminSyndicationDetail|EBF'],
				'dataAttribs':{'dst':'EBF'}
				});
			app.u.handleAppEvents($target);
			$(':checkbox.applyAnycb',$target).anycb();
			app.ext.admin.u.applyEditTrackingToInputs($target);

//populate 'extras' tab, which is used for tokens and profiles.
app.u.dump(" -> $('.anytabsContainer',$target).find('li'): "+$('.anytabsContainer:first',$slimLeftContent).find('li:eq(2)').length);
			$('.anytabsContainer:first',$slimLeftContent).find('li:eq(1) a').trigger('click'); //make tokens and profiles tab active.
			$extrasTabContent.anycontent({
				'templateID' : 'ebayTokensAndProfilesTemplate',
				'data' : $.extend(true,{},app.data['adminSyndicationDetail|EBF'],app.data.adminEBAYProfileList,app.data.adminEBAYTokenList)
				});
			$('table',$extrasTabContent).anytable();
			app.u.handleAppEvents($extrasTabContent);
			}
		else	{
			$target.anycontent({'templateID':'syndication_register_ebf','showLoading':false,'dataAttribs':{'dst':'EBF'}});
			app.u.handleAppEvents($target);
			}
		}
	}}},'mutable');
app.model.dispatchThis('mutable');


				}, //showEBAY
		
			showEBAYLaunchProfileEditor : function($target,profile,vars)	{
				vars = vars || {};
				if($target instanceof jQuery && profile)	{

					var $profileContent = $("<div \/>").css('min-height','200').addClass('clearfix'); /* minheight is for showloading */
					if(vars.fromupgrade)	{$profileContent.addClass('conditionMet')}
	//instead of applying anycontent to the tab itself, it's applied to a child element. avoids potential conflicts down the road.
					$target.empty().append($profileContent);
					$target.showLoading({'message':'Fetching launch profile details for '+profile});
	
					app.model.addDispatchToQ({
						'_cmd':'adminEBAYProfileDetail',
						'PROFILE' : profile,
						'_tag' : {
							'datapointer' : 'adminEBAYProfileDetail|'+profile,
							'callback' : function(rd){
								$target.hideLoading();
								if(app.model.responseHasErrors(rd)){
									$target.anymessage({'message':rd})
									}
								else	{
									
									$profileContent.anycontent({'templateID':'ebayProfileCreateUpdateTemplate',data : $.extend(true,{},app.data[rd.datapointer],app.data.adminEBAYTemplateList,app.data.adminEBAYTokenList)});
									$("[name='PROFILE']",$profileContent).closest('label').hide(); //field is not editable.
	
									$('fieldset',$profileContent).each(function(){
										var $fieldset = $(this);
//										app.u.dump(" -> $fieldset.data('panelname'): "+$fieldset.data('panelname'));
										$fieldset.anypanel({
											'showClose': false,
											'extension' : 'admin_syndication',
											'state' : 'persistent',
											'persistent' : true,
											'name' : $fieldset.data('panelname')
											});
										$fieldset.addClass('marginBottom');
										})
									app.u.handleAppEvents($profileContent);
									app.ext.admin.u.applyEditTrackingToInputs($('form',$profileContent));
									$('.applyAnycb',$profileContent).anycb();
									$('.gridTable tbody',$profileContent).sortable({'items':'tr'});
									$('.toolTip').tooltip();
									}
								}
							}
						},'mutable');
					app.model.dispatchThis('mutable');
					}
				else	{
					$('#globalMessaging').anymessage({"message":"In admin_syndication.a.showEBAYLaunchProfileEditor, either $target not a valid jquery object ["+($target instanceof jQuery)+"] or profile ["+profile+"] is blank.","gMessage":true});
					
					}
				}, //showEBAYLaunchProfileEditor

//shows the editor for a given marketplace, by DST code.
			showDSTDetails : function(DST,$target)	{
//				app.u.dump("BEGIN admin_syndication.a.showDSTDetails"); 
				app.ext.admin.calls.adminWholesaleScheduleList.init({},'passive'); //most syndication 'settings' use this. have it handy
				app.model.dispatchThis('passive');

				if($target && DST)	{
//					app.u.dump(" -> $target and DST are set ");

					$target.empty();
					$target.anycontent({'templateID':'syndicationDetailTemplate','data':{},'dataAttribs':{'dst':DST}});
	
						
					$('.anytabsContainer',$target).anytabs();
//there is a bug either in the tab script or the browser. Even though the container is emptied (i even destroyed the tabs at one point) 
// when the new editor appears, whichever tab was previously selected stays selected. The code below triggers a tab click but not the request code.
					
					
					var $form = $("[data-anytab-content='settings'] form:first",$target);
					$form.showLoading({'message':'Fetching Marketplace Details'});
					
					app.u.handleAppEvents($("[data-anytab-content='diagnostics']",$target));
				

					if(DST == 'EBF')	{
						app.ext.admin_syndication.a.showEBAY($form);
						}
					else	{
						$('.anytabsContainer',$target).find('li:first a').trigger('click.anytabs');
						app.ext.admin.calls.adminSyndicationDetail.init(DST,{callback : 'anycontentPlus','applyEditTrackingToInputs':true,'extension':'admin_syndication','templateID':'syndication_'+DST.toLowerCase(),'jqObj':$form},'mutable');
						}

						
						
						app.model.dispatchThis();
	
	//add an action to the tab click. the tab code itself already opens the associated content area.
						$("[data-app-role='filesTab'], [data-app-role='historyTab'], [data-app-role='errorsTab']").on('click.fetchData',function(){
							var
								$tab = $(this),
								$tabContent,
								cmd = "" 
						
							if($tab.data('app-role') == 'filesTab')	{
								cmd = "adminSyndicationListFiles";
								$tabContent = $("[data-anytab-content='files']",$target);
								}
							else if($tab.data('app-role') == 'historyTab')	{
								cmd = "adminSyndicationHistory";
								$tabContent = $("[data-anytab-content='history']",$target);
								}
							else if($tab.data('app-role') == 'errorsTab')	{
								cmd = "adminSyndicationFeedErrors";
								$tabContent = $("[data-anytab-content='errors']",$target);
								}
							else	{
								app.u.dump("UH OH!  got someplace we shouldn't get. In admin.a.showDSTDetails");
								} //unsupported role. shouldn't get here based on the selector to get into this loop.
							
							
						
							if($tab.data('haveContent'))	{} //do nothing. content has already been fetched.
							else if(cmd)	{
								$tab.data('haveContent',true);
								$tabContent.showLoading({'message':'Fetching File List'});
								app.ext.admin.calls[cmd].init(DST,{callback : 'anycontentPlus','extension':'admin_syndication','jqObj':$tabContent},'mutable');
								app.model.dispatchThis('mutable');
								}
							else	{
								//should never get here.
								$('#globalMessaging').anymessage({'message':'In showDSTDetails, the click event added to the tab has an invalid app-role (no cmd could be determined)'});
								}
						//	app.u.dump(" -> Tab Click: "+cmd);
						//	app.u.dump(" -> $tabContent.length: "+$tabContent.length);
							});

					}
				else if($target)	{
					$target.anymessage({"message":"In admin.a.showDSTDetails, no DST specified.",'gMessage':true});
					}
				else	{
					$('#globalMessaging').anymessage({"message":"In admin.a.showDSTDetails, no DST or target specified.",'gMessage':true});
					}
				
				}, //showDSTDetails
			
			showTemplateChooserInModal : function(profile)	{
				if(profile)	{
					var $D = app.ext.admin.i.dialogCreate({
						'title' : 'eBay Template Chooser',
						'templateID' : 'ebayTemplateChooserTemplate',
						data : app.data.adminEBAYTemplateList
						});
					$D.attr('id','ebayTemplateChooser');
					$D.data('profile',profile);
					$D.dialog('open');
					
					$D.imagegallery({
						selector: 'a[data-gallery="gallery"]',
						show: 'fade',
						hide: 'fade',
						fullscreen: false,
						slideshow: false
						});
					
					}
				else	{
					$('#globalMessaging').anymessage({"message":"In admin_syndication.a.showTemplateChooserInModal, no profile passed.","gMessage":true});
					}
				} //showTemplateChooserInModal
			
			}, //Actions

////////////////////////////////////   RENDERFORMATS    \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

//renderFormats are what is used to actually output data.
//on a data-bind, format: is equal to a renderformat. extension: tells the rendering engine where to look for the renderFormat.
//that way, two render formats named the same (but in different extensions) don't overwrite each other.
		renderFormats : {

			}, //renderFormats
////////////////////////////////////   UTIL [u]   \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

//utilities are typically functions that are exected by an event or action.
//any functions that are recycled should be here.
		u : {

//this doesn't impact what the action on the button is, just whether or not the button is enabled/disabled and what class is applied.
			handleDetailSaveButton : function($ele)	{
				
				var
					$settingsContainer = $ele.closest("[data-anytab-content='settings']"),
					$form = $('form',$settingsContainer).first(),
					$button = $settingsContainer.find("[data-app-role='saveButton']"),
					numChanges = $('.edited',$form).length;
				
				if(numChanges)	{
					$button.addClass('ui-state-highlight').button('enable');
					$('.numChanges',$button).text(numChanges);
					}
				else	{
					$("[data-app-role='saveButton']",$form).button('disable').find('.numChanges').text(""); //make save buttons not clickable.
					}
				
				}, //handleDetailSaveButton

/*executed when an ebay store category is clicked.
If the category is NOT a leaf, it will load the children.
if the category IS a leaf:
   it will show the item specifics if categoryselect is primary. 
   if categoryselect is secondary, it will update the product record and close the modal.
pass in an LI.  expects certain data params to be set on the li itself. specifically 
*/
			handleEBAYChild : function($li)	{
				app.u.dump("BEGIN admin_syndication.u.handleEBAYChild");
				if($li && $li.length && $li.data('categoryid'))	{
					var
						categoryid = $li.data('categoryid'),
						$chooser = $('#ebayCategoryChooser'),
						$XSLContentArea = $chooser.find("[data-app-role='ebayCategoryChooserXSLContainer']"),
						data = $chooser.data();
//categoryselect is necessary so that it can be determined whether or not items specifics should be displayed.
					if(data.categoryselect) 	{

//					app.u.dump(" -> categoryid: "+categoryid); app.u.dump(" -> data: "); app.u.dump(data);
						
					
//if the children have already been generated, just toggle them on click (display on/off).
						if($('ul',$li).length)	{
							app.u.dump(" -> toggle");
							//on a toggle, XSLContentArea is not emptied (at this time).
							//already have categories. toggle ul
							$('ul',$li).first().toggle();
							}

						else if(Number($li.data('leaf')) >= 1 && data.categoryselect == 'secondary')	{

							app.model.addDispatchToQ({
								'_cmd' : 'adminProductUpdate',
								'@updates' : ["SET-EBAY?category2="+categoryid],
								'pid' : data.pid
								},'passive');			
							app.model.dispatchThis('passive');
							if(data.pathid)	{
								var path = app.ext.admin_syndication.u.buildEBAYCategoryPath(categoryid);
								if(path)	{$(app.u.jqSelector('#',data.pathid)).text(path)}
								else	{
									$('.appMessaging').anymessage({"message":"In admin.u.handleEBAYChildren, unable to determine path for categoryid. As long as the category ID populated the form as needed, this is not a big deal. Dev: see console for details."});
									}
								}
							if(data.inputid)	{
								$(app.u.jqSelector('#',data.inputid)).val(categoryid).effect('highlight', {}, 2500);
								$chooser.dialog('close');
								}
							else	{
								$('.appMessaging').anymessage({"message":"In admin.u.handleEBAYChildren, unable to determine inputid. Should be set on $(#ebayCategoryChooser).data() "});
								}
							}

						else if(Number($li.data('leaf')) >= 1)	{
							app.u.dump(" -> leaf!");
							$chooser.data('categoryid',categoryid); //only set the category ID if a leaf. prohibits a non-leaf category from being selected accidentally.
							$('.activeListItem',$chooser).removeClass('activeListItem');
							$li.addClass('activeListItem');
							$XSLContentArea.empty();
							$chooser.showLoading({'message':'Fetching item specifics data'});
							
							var dispatch = app.ext.admin_syndication.u.buildEBAYXSLCmd(categoryid,data.pid);
							dispatch._tag.callback = function(rd){
								$chooser.hideLoading();
								if(app.model.responseHasErrors(rd)){
									$XSLContentArea.anymessage({'message':rd})
									}
								else	{
									$XSLContentArea.append(app.data[rd.datapointer].html);
									$('#APIForm').show(); //form is hidden by default
									app.u.handleAppEvents($chooser);
									}
								}
							app.model.addDispatchToQ(dispatch,'mutable');
							app.model.dispatchThis('mutable');
							}

						else	{
//							app.u.dump(" -> get subcats");
							$XSLContentArea.empty(); //this will get re-populated on another leaf click.
							$('#APIForm').hide(); //cleans up the ui to hide this. inappropriate buttons are hidden.
							var $ul = $("<ul \/>",{'id':'children4_'+$li.data('categoryid'),'data-bind':'var: ebay(@CHILDREN); format: processList; loadsTemplate:ebayCategoryListitemTemplate;'});
							$ul.addClass('noPadOrMargin marginLeft').appendTo($li)
							$ul.showLoading({'message':'Fetching Categories...'});
							app.ext.admin.calls.adminEBAYCategory.init({
								'categoryid':$li.data('categoryid')
//								'pid' : data.pid //don't get pid here. tweeners (non leaf or root) can use localstorage.
								},{'callback':'anycontent','jqObj':$ul},'mutable');
							app.model.dispatchThis('mutable');
							}
						}
					else	{
						$('.appMessaging').anymessage({"message":"In admin.u.loadEBAYChildren, unable to determine categoryselect mode. should be primary or secondary and set on $(#ebayCategoryChooser).data() "});
						}
					
					}
				else	{
					$('.appMessaging').anymessage({"message":"In admin.u.loadEBAYChildren, $li was either not passed, has no length or li.data('id') has no value. DEV: see console for details.","gMessage":true});
					app.u.dump("What follows this is the $li value passed into loadEBAYChildren: "); app.u.dump($li);
					}
				}, //handleEBAYChild

			buildEBAYCategoryPath : function(categoryid)	{
				var r = false; // what is returned. either the path (as a string) or false if the path could not be generated.
				if(categoryid && app.data['adminEBAYCategory|'+app.model.version+'|'+categoryid])	{
					if(app.data['adminEBAYCategory|'+app.model.version+'|'+categoryid]['%INFO'] && app.data['adminEBAYCategory|'+app.model.version+'|'+categoryid]['@PARENTS'])	{
						var
							parents = app.data['adminEBAYCategory|'+app.model.version+'|'+categoryid]['@PARENTS'], //shortcut
							L = (parents.length - 1);
						//loop thru backwards because oldest parent is at bottom of array.
						for(var i = L; i >= 0; i -= 1)	{
							r += parents[i].name + " / ";
							}
						
						r += app.data['adminEBAYCategory|'+app.model.version+'|'+categoryid]['%INFO'].name
						
						}
					else	{
						app.u.dump("In admin_syndication.u.buildEBAYCategoryPath, ebay category data is in memory, but either %INFO or @PARENTS is not present.");
						}
					}
				else	{
					app.u.dump("In admin_syndication.u.buildEBAYCategoryPath, unable to build category path. either categoryid ["+categoryid+"] not passed or ebay category data doesn't exist in memory.");
					}
				return r;
				}, //buildEBAYCategoryPath

			buildEBAYXSLCmd : function(categoryid,pid)	{
				return {
					"_cmd" : "adminEBAYCategory",
					"pid" : pid,
					"categoryid" : categoryid,
					"xsl" : app.ext.admin_syndication.vars.ebayXSL,
					"form" : $("[data-app-role='ebayCategoryChooserXSLContainer']",'#APIForm').serialize(), //sent as KvP cuz all the checkboxes have the same name. why wouldn't they? #@!%ing ebay.
					"_tag" : {
						'datapointer' : 'adminEBAYCategory|'+app.model.version+'|'+categoryid
						}
					}
				}, //buildEBAYXSLCmd
				
//for item specifics, can't just serialize the fieldset because the wikihash format wants the data formatted differently.
// there are two inputs on each row, the value of 1 is the key and the value of the second is the value.			
			buildItemSpecificsMacro : function()	{
				var	$fieldset = $("[data-app-role='ebayCategoryChooserItemSpecificsFieldset']",'#APIForm');
				var kvp = "";
				$('.inputContainer',$fieldset).each(function(){
					var $row = $(this);
					if($('input:first',$row).val() && $('input:last',$row).val())	{
						kvp += $('input:first',$row).val()+":"+$('input:last',$row).val()+"\n";
						}
					})
				return "SET-EBAY?itemspecifics="+encodeURIComponent(kvp);
				}, //buildItemSpecificsMacro

			ebayShowTreeByChild : function(categoryid)	{
					app.u.dump("BEGIN admin_syndication.u.ebayShowTreeByChild");
					app.u.dump(' -> categoryid: '+categoryid);
					$('#APIForm').show(); //make sure form is visible.
					var $chooser = $('#ebayCategoryChooser');					
					$chooser.data('categoryid',categoryid); //update the 'global' data object to reference the category now in focus.
					
					var	
						data = $chooser.data() || {},
						$messageDiv = $chooser.find("[data-app-role='eBayCatChooserMessaging']:first"),
						$XSLContentArea = $chooser.find("[data-app-role='ebayCategoryChooserXSLContainer']:first");

					if(categoryid)	{

$chooser.showLoading({'message':'Fetching eBay category tree data'});
$('.activeListItem',$chooser).removeClass('activeListItem');
if(categoryid && data.pid)	{
//						app.u.dump(" -> categoryid ["+categoryid+"] and pid ["+data.pid+"] both obtained.");
//fetch detail on the recently viewed category. This will contain a list of parents orders from closest to leaf (at zero spot) to top-most.
//xsl is set so that the request doesn't have to be made again.
	app.ext.admin.calls.adminEBAYCategory.init({
		'categoryid':categoryid,
		'pid' : data.pid,
		'xsl' : app.ext.admin_syndication.vars.ebayXSL
		},{'callback' : function(rd){

			if(app.model.responseHasErrors(rd)){
				$chooser.hideLoading();
				$messageDiv.anymessage({'message':rd})
				}
			else	{
				app.u.dump(" -> successfully retrieved data for leaf ["+categoryid+"].");
				var
					leafData = app.data[rd.datapointer], //gets used much later after rd... has been overwritten in other requests.
					parents = leafData['@PARENTS'],
					L = parents.length;
				
			//	app.u.dump(" -> leaf has "+L+" parents");
				//get the category detail for each branch in the tree handy.
				for(var i = 0; i < L; i += 1)	{
					app.ext.admin.calls.adminEBAYCategory.init({'categoryid':categoryid,'pid' : data.pid},{},'mutable');
					}
				app.calls.ping.init({'callback':function(rd){
					if(app.model.responseHasErrors(rd)){
						$chooser.hideLoading();
						$messageDiv.anymessage({'message':rd})
						}
					else	{
//All the data is available at this point, right down to the leaf, so trigger a click on each branch, starting at the top (last item in parents array).
//this only triggers the clicks on the parents, not on the leaf itself. We already have that data from our original request to get the parents.
						for(var i = (L-1); i >= 0; i -= 1)	{
//							app.u.dump(i+"). "+parents[i].categoryid+" "+parents[i].name);
							var $li = $("[data-categoryid='"+parents[i].categoryid+"']:first",$chooser)
							if($('ul',$li).length)	{$li.show();} //if the chooser has already been opened, this category may already be loaded.
							else	{$li.find('span:first').trigger('click');} //category hasn't been loaded yet, trigger a click.
							}
						$chooser.hideLoading();
						$XSLContentArea.empty().append(leafData.html);
						app.u.handleAppEvents($chooser);
						$("[data-categoryid='"+categoryid+"']:first",$chooser).addClass('activeListItem');
						$('#APIForm').show(); //form is hidden by default
						}
					}},'mutable');
				app.model.dispatchThis('mutable');
				}
			}},'mutable');
	app.model.dispatchThis('mutable');
	}
else if(!data.pid)	{
	$messageDiv.anymessage({'message':'In admin_syndication.u.ebayShowTreeByChild, unable to ascertain data.pid. Expected on $(#ebayCategoryChooser).data(pid).','gMessage':true});
	app.u.dump("This is data() from $(#ebayCategoryChooser): "); app.u.dump(data);
	}
else	{
	$messageDiv.anymessage({'message':'Please choose a category from the list.'})
	}


						}
					else	{
						
						$messageDiv.anymessage({'message':'In admin_syndication.u.ebayShowTreeByChild,no categoryid passed.','gMessage':true});
						
						}
					}, //ebayShowTreeByChild

			getUpdatedEBAYAttributesForm : function($form)	{

				app.u.dump("BEGIN admin_syndication.u.updateSpecifics");

				var
					$chooser = $('#ebayCategoryChooser'),
					$XSLContentArea = $("[data-app-role='ebayCategoryChooserXSLContainer']",$form),
					pid = $chooser.data('pid'),
					categoryid = $chooser.data('categoryid');
				app.u.dump(" -> categoryid: "+categoryid);
				if($form && $XSLContentArea && categoryid)	{
				
					$chooser.showLoading({'message':'Updating item specifics'});
					var dispatch = app.ext.admin_syndication.u.buildEBAYXSLCmd(categoryid,pid);
					dispatch.form = $("[data-app-role='ebayCategoryChooserXSLContainer']",$form).serialize(); //sent as KvP cuz all the checkboxes have the same name. why wouldn't they? #@!%ing ebay.
					dispatch._tag.callback = function(rd){
						$chooser.hideLoading();
						$form.show(); //form is hidden by default
						if(app.model.responseHasErrors(rd)){
							$form.anymessage({'message':rd})
							}
						else	{
							$XSLContentArea.html(app.data[rd.datapointer].html);
							app.u.handleAppEvents($chooser);
							}
						}

					app.model.addDispatchToQ(dispatch,'mutable');
					app.model.dispatchThis('mutable');
					}
				else	{
					$('#APIForm').anymessage({'message':'In admin_syndication.u.getUpdatedEBAYAttributesForm, either $form ['+typeof $form+'] not passed or unable to determine categoryid from XSL content area ['+typeof $XSLContentArea+']','gMessage':true});
					}
				}, //getUpdatedEBAYAttributesForm

			handleEBAYTemplateSelect : function(vars)	{
				vars = vars || {};
				var $ETC = $('#ebayTemplateChooser'); 
				if(vars.SUBDIR && vars.PROJECTID && vars.PROFILE)	{
					$ETC.showLoading({'message':'One moment please. Copying files into profile directory.'});
					vars._cmd = 'adminEBAYTemplateInstall';
					vars._tag = {
						'callback' : function(rd)	{
							if(app.model.responseHasErrors(rd)){
								$form.anymessage({'message':rd})
								}
							else	{
								$ETC.dialog('close');
								$('#globalMessaging').anymessage(app.u.successMsgObject("Thank you, the eBay template "+vars.SUBDIR+" has been copied into the profile "+vars.PROFILE+"."));
								$('.pageSyndication:first').find("[data-app-role='ebayTemplateOrigin']:first").text(vars.SUBDIR);
								}
							}
						}
					app.model.addDispatchToQ(vars,'immutable'); //app.model.dispatchThis('immutable');
					app.model.addDispatchToQ({
						'_cmd':'adminEBAYProfileUpdate',
						'template_origin':vars.SUBDIR,
						'PROFILE' : vars.PROFILE
						},'immutable');
					app.model.dispatchThis('immutable');
					}
				else	{
					$ETC.anymessage({"message":"","gMessage":true});
					}
				}, //handleEBAYTemplateSelect

			ebayKISSInspectObject : function($object,$objectInspector)	{
				if($object instanceof jQuery && $objectInspector instanceof jQuery)	{

					var data = $object.data(), r = "<ul class='listStyleNone noPadOrMargin'>";

					if(data.object)	{
						for(index in data)	{
							r += "<li>"+index+": "+data[index]+"<\/li>";
							}
						}
					else	{
						r += "<li>This object is not dynamic<\/li>";
						}
					
					r += "<li>tag type: "+$object.get(0).tagName+"<\/li>";

					if($object.is('img'))	{
						r += "<li>width: "+($object.attr('width') || $object.width())+"<\/li>";
						r += "<li>height: "+($object.attr('height') || $object.height())+"<\/li>";
						}

					$objectInspector.empty().append(r)
					r += "<\/ul>";

					}
				else	{
					$('#globalMessaging').anymessage({'message':"In admin_syndication.u.handleWizardProgressBar, either object ["+$object instanceof jQuery+"] or objectInspector ["+$objectInspector instanceof jQuery+"] were not valid jquery objects.",'gMessage':true});
					}
				},

			getEBAYToolbarButtons : function()	{

return [{
			css : 'imageadd',
			'text' : 'Upload New Image to Profile',
			action: function (btn) {
				var $D = $("<div \/>");
				$D.dialog({
					'modal':true,
					'width':500,
					height : 500,
					'autoOpen' : false
					});
				$D.anycontent({'templateID':'ebayTemplateEditorImageUpload',data : {}});
				$D.dialog('open');
				app.ext.admin_medialib.u.convertFormToJQFU($('form',$D),'ebayTemplateMediaUpload');
				}
			}	,	{
			css: 'image',
			text: 'Place Image',
			action: function (btn) {
				var 
					$D = $('#ebayTemplateEditorImageListModal'),
					profile = $('#ebayTemplateEditor').data('profile'),
					jhtmlobject = this; //'this' is set by jhtmlarea to the iframe.
				if($D.length)	{
					$D.empty(); //clear contents
					}
				else	{
					$D = $("<div \/>",{'id':'ebayTemplateEditorImageListModal'});
					$D.dialog({
						'title' : 'Select Media',
						'modal':true,
						'width':'60%',
						'autoOpen' : false
						});
					}
				$D.append("<ul class='listStyleNone' data-bind='var: media(@images); format:processList; loadsTemplate:ebayTemplateEditorMediaFileTemplate;' \/>");
				$D.dialog('open');
				$D.showLoading({'message':'Updating File List'});
				app.ext.admin_medialib.calls.adminImageFolderDetail.init('_ebay/'+profile,{'callback' : function(rd){
					if(app.model.responseHasErrors(rd)){
						$('#globalMessaging').anymessage({'message':rd});
						}
					else	{
						//success content goes here.
						var L = app.data[rd.datapointer]['@images'].length;
//need a 'path' set for the data-bind to render.
						for(var i = 0; i < L; i += 1)	{
							app.data[rd.datapointer]['@images'][i]['path'] = "_ebay/"+profile+"/"+app.data[rd.datapointer]['@images'][i]['Name']
							}
						$D.anycontent({'datapointer':rd.datapointer});
						app.u.handleAppEvents($D,{'btn':btn,'jhtmlobject':jhtmlobject});
						$D.imagegallery({
							selector: 'a[data-gallery="gallery"]',
							show: 'fade',
							hide: 'fade',
							fullscreen: false,
							slideshow: false
							});
						$D.dialog("option", "position", "center");
						}
					}},'mutable');
				app.model.dispatchThis('mutable');
				}
			},{
			css : 'prodattributeadd',
			'text' : 'Add a Product Attribute',
			action: function (btn) {
				var jhtml = this; //the jhtml object.
				var $D = app.ext.admin.i.dialogCreate({
					'title' : 'Add Product Attribute'
					});
				$D.dialog('open');
				$ul = $("<ul class='lookLikeLink' \/>");

//eww.  but it got me here quick for a practical demo.  Probably want to do this as a json object. could we load flexedit? may be suicidal.

$("<li \/>").text('Product Name').on('click',function(){
	jhtml.pasteHTML("<span class='actbProductAttribute' data-attrib='zoovy:prod_name' data-input-cols='100' data-input-data='product:zoovy:prod_name' data-input-type='TEXTBOX' data-label='Product Name' data-object='PRODUCT' id='PROD_NAME'>Product name</span>");
	$D.dialog('close');
	}).appendTo($ul);

$("<li \/>").text('Product Manufacturer').on('click',function(){
	jhtml.pasteHTML("<span class='actbProductAttribute' data-attrib='zoovy:prod_mfg' data-input-cols='100' data-input-data='product:zoovy:prod_mfg' data-input-type='TEXTBOX' data-label='Product Manufacturer' data-object='PRODUCT' id='PROD_MFG'>Product Manufacturer</span>");
	$D.dialog('close');
	}).appendTo($ul);

$("<li \/>").text('Product Description').on('click',function(){
	jhtml.pasteHTML("<span class='actbProductAttribute' data-attrib='zoovy:prod_desc' data-input-cols='80' data-input-data='product:zoovy:prod_desc' data-input-rows='5' data-input-type='TEXTAREA' data-label='Product Description (shared)' data-object='PRODUCT' id='PROD_DESC'>Product Description</span>");
	$D.dialog('close');
	}).appendTo($ul);

$("<li \/>").text('Product Features').on('click',function(){
	jhtml.pasteHTML("<span class='actbProductAttribute' data-attrib='zoovy:prod_features' data-input-cols='80' data-input-data='product:zoovy:prod_features' data-input-rows='5' data-input-type='TEXTAREA' data-label='Product Features (shared)' data-object='PRODUCT' id='PROD_FEATURES'>Product Features</span>");
	$D.dialog('close');
	}).appendTo($ul);

$("<li \/>").text('Product Image 5').on('click',function(){
	jhtml.pasteHTML("<span class='actbProductAttribute' data-attrib='zoovy:prod_image5' data-if='BLANK' data-object='PRODUCT' data-then='REMOVE' id='IMAGE5'><a class='actbProductAttribute' data-attrib='zoovy:prod_image5' data-format='img' data-img-bgcolor='ffffff' data-img-border='0' data-img-data='product:zoovy:prod_image5' data-img-height='' data-img-width='200' data-img-zoom='1' data-label='Image5' data-object='PRODUCT' id='IMAGE5' width='200'><img class='actbProductAttribute' data-attrib='zoovy:prod_image5' data-format='img' data-img-bgcolor='ffffff' data-img-border='0' data-img-data='product:zoovy:prod_image5' data-img-zoom='1' data-label='Image5 (200 by X)' data-object='PRODUCT' id='IMAGE5' src='placeholder-2.png' width='200'></a></span>");
	$D.dialog('close');
	}).appendTo($ul);
$ul.appendTo($D);

				}
			}]
				}

			}, //u [utilities]

		e : {


/*
run when the 'save' button is pushed in the ebay category/item specifics modal.
first, it does an adminEBAYCategory and passes the XSL and form contents. This is to get the most up to data XML that is returned by that call
 -> NOTE: once transform is handled within the app itself, that extra call won't be necessary
After that, it puts together the adminProductUpdate call, which has up to three updates:
 1. item specifics, based on the 'custom detail' button are added.
 2. the category id is set.
 3. ebay attributes are set (this is the form returned in the adminEBAYCategory call when XSL is sent.

after that cmd is sent, the modal is closed and the original input is updated. If path was passed as the third param in showEBAYCategoryChooserInModal, it is also updated.
*/			
			ebaySaveCatAndUpdateItemSpecifics : function($btn)	{
				$btn.button();
				$btn.off('click.ebayUpdateItemSpecifics').on('click.ebayUpdateItemSpecifics',function(){

				var
					$form = $btn.closest('form'),
					$chooser = $('#ebayCategoryChooser'),
					data = $chooser.data(),
					categoryid = $chooser.data('categoryid');
					
					if(data.pid && data.categoryselect && data.inputid && categoryid)	{



$chooser.showLoading({'message':'Saving changes'});
var dispatch = app.ext.admin_syndication.u.buildEBAYXSLCmd(categoryid,data.pid);
dispatch.form = $form.serialize(); //sent as KvP cuz all the checkboxes have the same name. why wouldn't they? #@!%ing ebay.
dispatch._tag.callback = function(rd)	{

	if(app.model.responseHasErrors(rd)){
		$form.anymessage({'message':rd})
		}
	else	{
//this object is what is used on the adminProductUpdate call.
		var obj = {
			'_cmd' : 'adminProductUpdate',
			'@updates' : new Array(),
			'pid' : data.pid,
			'_tag' : {
				'callback' : function(responseData){ //didn't use rd as param name here just to avoid confusion.
					if(app.model.responseHasErrors(responseData)){
						$form.anymessage({'message':responseData})
						}
					else	{
						$('#ebayCategoryChooser').dialog('close');
						}
					}
				}
			}

		if($("[data-app-role='ebayCategoryChooserItemSpecificsFieldset']",$form).find('.inputContainer').length)	{
			app.u.dump(" -> there are item specifics. add a macro.");
			obj['@updates'].push(app.ext.admin_syndication.u.buildItemSpecificsMacro());
			}
		
//		app.u.dump(" -> obj follows:"); app.u.dump(obj); die();
		//set the category.
		obj['@updates'].push("SET-EBAY?category"+(data.categoryselect == 'primary' ? '' : 2)+"="+categoryid);
		
		obj['@updates'].push("SET-EBAY?attributeset="+encodeURIComponent(app.data[rd.datapointer]['ebay:attributeset']));
		
		app.model.destroy("adminEBAYCategory|"+app.model.version+"|"+data.pid+"|0"); //this data changes as a result of the product update.
		if(data.pathid)	{
			var path = app.ext.admin_syndication.u.buildEBAYCategoryPath(categoryid);
			if(path)	{$(app.u.jqSelector('#',data.pathid)).text(path)}
			else	{
				$('.appMessaging').anymessage({"message":"In admin.u.handleEBAYChildren, unable to determine path for categoryid. As long as the category ID populated the form as needed, this is not a big deal. Dev: see console for details."});
				}
			}
		
		//update the original input.
		$(app.u.jqSelector('#',data.inputid)).val(categoryid);					
								
		//app.u.dump(" OBJ: "); app.u.dump(obj);
		app.model.addDispatchToQ(obj,'immutable');			
		app.model.dispatchThis('immutable');

		}
	};

app.model.addDispatchToQ(dispatch,'immutable');
app.model.dispatchThis('immutable');



						}
					else	{
						$form.anymessage({'message':'In admin_syndication.e.ebaySaveCatAndUpdateItemSpecifics, unable to ascertain the pid ['+data.pid+'] and/or categoryselect ['+data.categoryselect+'] and/or categoryid ['+categoryid+'] , expected to find them on $(\'#ebayCategoryChooser\').data()','gMessage':true});
						}

					});
				}, //ebaySaveCatAndUpdateItemSpecifics
			
			ebayLaunchProfileDeleteConfirm : function($btn)	{
				$btn.button({icons: {primary: "ui-icon-trash"},text: false});
				$btn.off('click.ebayLaunchProfileDeleteConfirm').on('click.ebayLaunchProfileDeleteConfirm',function(event){
					event.preventDefault();
					var 
						$tr = $btn.closest('tr'),
						data = $tr.data();

					app.ext.admin.i.dialogConfirmRemove({
						"title" : "Delete Profile "+data.profile,
						"removeButtonText" : "Delete Profile",
						"message" : "Please confirm that you want to delete the  launch  profile: "+data.profile+" . There is no undo for this action.",

						'removeFunction':function(vars,$D){
							$D.showLoading({"message":"Deleting Launch Profile "+data.profile});
							app.model.addDispatchToQ({
								'_cmd':'adminEBAYProfileRemove',
								'PROFILE': data.profile,
								'_tag':	{
									'callback':function(rd){
									$D.hideLoading();
									if(app.model.responseHasErrors(rd)){
										$('#globalMessaging').anymessage({'message':rd});
										}
									else	{
										$D.dialog('close');
										$('#globalMessaging').anymessage(app.u.successMsgObject('The profile has been removed.'));
										$tr.empty().remove(); //removes row for list.
										}
									}
								}
							},'immutable');
							app.model.dispatchThis('immutable');
							}
						});
					});
				}, //ebayLaunchProfileDeleteConfirm

			ebayLaunchProfileCreateShow : function($btn)	{
				$btn.button();
				$btn.off('click.ebayLaunchProfileCreateShow').on('click.ebayLaunchProfileCreateShow',function(event){
					event.preventDefault();
					var $D = app.ext.admin.i.dialogCreate({
						'title' : 'Create new eBay Launch Profile'
						});
					
					$D.dialog('option','width','350');
					var 
						$input = $("<input name='PROFILE' placeholder='profile name' value='' maxlength='8' type='text' \/>"),
						$button = $("<button>Create<\/button>").button();

					$input
						.on('keyup',function(){
							$(this).val($(this).val().toUpperCase()); //value needs to be uppercase.
							})
						.off('keypress.alphaNumeric').on('keypress.alphaNumeric',function(event){
							return app.u.alphaNumeric(event); //disable all special characters
							})
						.addClass('marginBottom');

					$button.on('click',function(event){
						event.preventDefault();
						if($D.find('.ui-widget-anymessage').length)	{$D.anymessage('close')} //clear any existing error messages.
						if($input.val())	{
							var profile = $input.val();
							if(profile.length < 9 && profile.length > 3)	{
								$D.showLoading({'message':'Creating profile '+profile});
								app.model.addDispatchToQ({
									'_cmd' : 'adminEBAYProfileCreate',
									'PROFILE' : profile,
									'_tag' : {
										'callback' : function(rd){
											if(app.model.responseHasErrors(rd)){
												$D.anymessage({'message':rd});
												}
											else	{
												$D.hideLoading();
												$D.dialog('close');
												app.ext.admin_syndication.a.showEBAYLaunchProfileEditor($(app.u.jqSelector('#',app.ext.admin.vars.tab+'Content')),profile);
												}
											}
										}
									},'immutable');
								app.model.dispatchThis('immutable');	
								}
							else	{
								$D.anymessage({"message":"Profile name must be between 4 and 8 characters."});
								}
							}
						else	{
							$D.anymessage({"message":"Please enter a profile name"});
							}
						});
					
					$("<form \/>").append($input).append("<span class='hint'>4-8 characters<\/span><br>").append($button).appendTo($D);
					
					$D.dialog('open');
					});
				}, //ebayLaunchProfileCreateShow

			ebayLaunchProfileRefreshListingsExec : function($btn)	{
				$btn.button();
				$btn.off('click.ebayLaunchProfileRefreshListingsExec').on('click.ebayLaunchProfileRefreshListingsExec',function(){

					app.ext.admin_batchJob.a.adminBatchJobCreate({
						'guid' : app.u.guidGenerator(),
						'profile' : $("input[name='PROFILE']",$btn.closest('form')).val(),
						'APP' : 'EBAY_UPDATE',
						'function' : 'refresh'
						});	

					})
				}, //ebayLaunchProfileRefreshListingsExec

			ebayTemplateChooserShow : function($btn)	{
				$btn.button();
				$btn.off('click.showTemplateChooserInModal').on('click.showTemplateChooserInModal',function(){
					app.ext.admin_syndication.a.showTemplateChooserInModal($btn.data('profile'));
					});
				}, //ebayTemplateChooserShow

			ebayTemplateChooserExec : function($ele)	{
				$ele.off('click.ebayTemplateChooserExec').on('click.ebayTemplateChooserExec',function(){
					var data = $ele.closest('li').data();
					app.ext.admin_syndication.u.handleEBAYTemplateSelect({
						SUBDIR : data.subdir,
						PROFILE : $('#ebayTemplateChooser').data('profile'),
						PROJECTID : data.projectid
						});
					})
				}, //ebayTemplateChooserExec

			ebayRefreshStoreCategoriesExec : function($btn)	{
				$btn.button({icons: {primary: "ui-icon-refresh"},text: false});
				$btn.off('click.ebayRefreshStoreCategoriesExec').on('click.ebayRefreshStoreCategoriesExec',function(){
					var $tab = $(app.u.jqSelector('#',app.ext.admin.vars.tab+'Content'));
					$tab.showLoading({'message':'Fetching catgories from eBay'});
					app.model.addDispatchToQ({
						'_cmd' : 'adminEBAYMacro',
						'@updates' : ["LOAD-STORE-CATEGORIES?eias="+$btn.closest('tr').data('ebay_eias')],
						'_tag' : {
							'callback' : 'showMessaging',
							'jqObj' : $tab,
							'message' : 'Your eBay store categories have been updated.'
							}
						},'immutable');
					app.model.dispatchThis('immutable');	
					});
				}, //ebayRefreshStoreCategoriesExec

//opens the ebay template in an editor
			showTemplateEditorInModal : function($btn)	{
				
				$btn.button();
				$btn.off('click.showTemplateEditorInModal').on('click.showTemplateEditorInModal',function(){
					app.ext.admin_templateEditor.a.showTemplateEditorInModal('ebay',{'profile':$btn.data('profile')})
					})
				}, //showTemplateEditorInModal

//executed on click in file chooser portion of the template editor (in jhtml toolbar add image)
			ebayHTMLEditorAddImage : function($ele,vars)	{
				$ele.off('click.ebayHTMLEditorAddImage').on('click.ebayHTMLEditorAddImage',function(){
 // Insert an Image by URL
       				vars.jhtmlobject.image($ele.closest("[data-name]").data('Name'));
					$('#ebayTemplateEditorImageListModal').dialog('close');
					});
				},


			ebayLaunchProfileUpdateExec : function($btn)	{
				$btn.button();
				$btn.off('click.ebayLaunchProfileUpdateExec').on('click.ebayLaunchProfileUpdateExec',function(event){
					event.preventDefault();
					
					var
						$form = $btn.closest('form'),
						$tab = $(app.u.jqSelector('#',app.ext.admin.vars.tab+'Content')),
						sfo = $form.serializeJSON({'cb':true});

					$tab.showLoading({'message':'Saving Launch Profile'});

					//the domestic and international shipping sections use the 'data table' technology.
					//their contents need formatted and saved to the serialized form object.
					function setShipping(type)	{
						//type needs to be 'dom' or 'int'
						var $shipping = $("[data-app-role='ebayShippingTbody_"+type+"']:first",$form).find('tr');
						if($shipping.length)	{
							sfo['@ship_'+type+'services'] = new Array();
							$shipping.each(function(index){
								app.u.dump(" -> index: "+index);
								var
									$tr = $(this),
									data = $tr.data();
									obj = {
										"service" : data.service,
										"free" : data.free,
										"cost" : data.cost,
										"addcost" : data.addcost
										}
//international has no farcost (AK+HI)
								if(type == 'dom')	{
									obj.farcost = data.farcost
									}
								sfo['@ship_'+type+'services'].push(obj);
								if(index >= 2)	{return false} //exit now. only 3 allowed.
								})
							}
						}
					
					setShipping('dom');
					setShipping('int');
//form inputs used in shipping. shouldn't be saved into the profile. Won't hurt, but let's keep it clean.
delete sfo.cost
delete sfo.farcost
delete sfo.service
delete sfo.addcost
delete sfo.free

					sfo._cmd = 'adminEBAYProfileUpdate';
					sfo._tag = {
						'callback' : function(rd)	{
							$tab.hideLoading();
							if(app.model.responseHasErrors(rd)){
								$('#globalMessaging').anymessage({'message':rd});
								}
							else	{
								app.ext.admin_syndication.a.showEBAYLaunchProfileEditor($tab,sfo.PROFILE);
								$('#globalMessaging').anymessage(app.u.successMsgObject('Your changes have been saved'));
								}
							}
						}
					app.model.addDispatchToQ(sfo,'immutable');
					app.model.dispatchThis('immutable');	

					});
				}, //ebayLaunchProfileCreateUpdateExec

			ebayLaunchProfileUpdateShow : function($btn)	{
				$btn.button({icons: {primary: "ui-icon-pencil"},text: false});
				if(Number($btn.closest('tr').data('v')) === 0)	{
					$btn.button('disable');
					}
				$btn.off('click.ebayLaunchProfileUpdateShow').on('click.ebayLaunchProfileUpdateShow',function(){
					var $table = $btn.closest('table');
//build the stickytab, if necessary.
					if($btn.closest('.ui-widget-stickytab-content').length)	{} //already in a sticky tab
					else if($('#stickytabs').children().length)	{} //not clicked from the sticky tab, but the tab is already open.
					else	{
						$table.stickytab({'tabtext':'Launch Profiles','tabID':'launchProfilesStickyTab'});
//make sure buttons and links in the stickytab content area close the sticktab on click. good usability.
						$('button, a',$table).each(function(){
							$(this).off('close.stickytab').on('click.closeStickytab',function(){
								$table.stickytab('close');
								})
							});
						}
//now show the editor.  This must happen after stickytab generation or the click events on the row buttons in the table get dropped.
					app.ext.admin_syndication.a.showEBAYLaunchProfileEditor($(app.u.jqSelector('#',app.ext.admin.vars.tab+'Content')),$btn.closest('tr').data('profile'));
					
					});
				}, //ebayLaunchProfileUpdateShow
			
			ebayLaunchProfileUpgradeConfirm : function($btn)	{
				var data = $btn.closest('tr').data();
				if(Number(data.v) === 0)	{
					$btn.button();
					$btn.off('click.ebayTokenDeleteConfirm').on('click.ebayTokenDeleteConfirm',function(event){
						//confirm dialog goes here.
						event.preventDefault();
						
						
	
						app.ext.admin.i.dialogConfirmRemove({
							"title" : "Upgrade launch profile: "+data.profile,
							"removeButtonText" : "Upgrade Profile",
							"message" : "The upgrade process is new. Please perform this on a launch profile that is infrequently used or create a new profile and point your product to that one. Immediately test after upgrade.",
							'removeFunction':function(vars,$D){
								$D.showLoading({"message":"Upgrading profile "+data.profile});
								app.model.addDispatchToQ({
									'_cmd':'adminEBAYMacro',
									'@updates': ["PROFILE-UPGRADE?PROFILE="+data.profile],
									'_tag':	{
										'callback':function(rd){
										$D.hideLoading();
										if(app.model.responseHasErrors(rd)){
											$('#globalMessaging').anymessage({'message':rd});
											}
										else	{
											$D.dialog('close');
											app.ext.admin_syndication.a.showEBAYLaunchProfileEditor($(app.u.jqSelector('#',app.ext.admin.vars.tab+'Content')),data.profile,{'fromupgrade':true});
//											app.ext.admin_syndication.a.showEBAY($btn.closest("[data-app-role='slimLeftContentSection']"));
											}
										}
									}
								},'immutable');
								app.model.dispatchThis('immutable');
								}
							});
						});
					}
				else	{
					$btn.hide();
					} //already upgraded. don't show button.
				}, //ebayLaunchProfileUpgradeConfirm
			
			ebayAddCustomDetailShow : function($btn)	{

				$btn.button();
				$btn.off('click.ebayAddCustomDetailShow').on('click.ebayAddCustomDetailShow',function(){
					var
						$fieldset = $btn.closest('fieldset'),
						numInputs = $('.inputContainer',$fieldset).length || 0;
					
					$btn.after("<div class='inputContainer marginTop'><input type='text' placeholder='Detail Title' value='' name='cs_name"+numInputs+"' class='marginRight' \/><input type='text' placeholder='Detail Value' value='' name='cs_value"+numInputs+"' \/><\/div>");
					});

				}, //ebayAddCustomDetailShow
				
			ebayShowTreeByChild : function($ele)	{
				$ele.children().first().attr({'disabled':'disabled','selected':'selected'});
				$ele.off('change.ebayShowTreeByChild').on('change.ebayShowTreeByChild',function(){
					app.ext.admin_syndication.u.ebayShowTreeByChild($ele.val());
					});
				}, //ebayShowTreeByChild
			
			ebayTokenDeleteConfirm : function($btn)	{
				$btn.button({icons: {primary: "ui-icon-trash"},text: false});
				$btn.off('click.ebayTokenDeleteConfirm').on('click.ebayTokenDeleteConfirm',function(event){
					//confirm dialog goes here.
					event.preventDefault();
					
					var data = $btn.closest('tr').data();

					app.ext.admin.i.dialogConfirmRemove({
						"title" : "Delete Token for "+data.ebay_username,
						"removeButtonText" : "Delete Token",
						"message" : "Please confirm that you want to delete the token. There is no undo for this action.",
						'removeFunction':function(vars,$D){
							$D.showLoading({"message":"Deleting eBay token "+data.ebay_eias});
							app.model.addDispatchToQ({
								'_cmd':'adminEBAYMacro',
								'@updates': ["TOKEN-REMOVE?eias="+data.ebay_eias],
								'_tag':	{
									'callback':function(rd){
									$D.hideLoading();
									if(app.model.responseHasErrors(rd)){
										$('#globalMessaging').anymessage({'message':rd});
										}
									else	{
										$D.dialog('close');
										$('#globalMessaging').anymessage(app.u.successMsgObject('Your token has been removed.'));
										app.ext.admin_syndication.a.showEBAY($ele.closest("[data-app-role='slimLeftContentSection']"));
										}
									}
								}
							},'immutable');
							app.model.dispatchThis('immutable');
							}
						});


					});
			
				}, //ebayTokenDeleteConfirm
			
			ebayTokenDeleteButtonset : function($ele)	{
				
				$('button',$ele).button();
				var $menu = $ele.next('ul');
				$menu.css({'position':'absolute','width':'200'}).menu().hide();
				
				$('button:first',$ele).off('click.ebayTokenDeleteConfirm').on('click.ebayTokenDeleteConfirm',function(event){
					event.preventDefault();
					$(this).next('button').trigger('click');
					return false; //here so that the 'one' in the next button doesn't get triggered by this click.
					})
				$('button:last',$ele).button({'text' : false, icons : {'primary':'ui-icon-triangle-1-s'}}).off('click.ebayTokenDeleteConfirm').on('click.ebayTokenDeleteConfirm',function(event){
					event.preventDefault();
					app.u.dump("Click triggered.");
					$menu.show().position({
						my: "right top",
						at: "right bottom",
						of: this
						});
					$(document).one( "click", function() {
						$menu.hide();
						});
					return false;
					});
				$ele.buttonset();
				
				}, //ebayTokenDeleteButtonset

			ebayTokenLinkTo : function($btn)	{
				$btn.button();
				$btn.off('click.ebayGetToken').on('click.ebayGetToken',function(){
					var url = $btn.data('sandbox') ==1 ? 'https://signin.sandbox.ebay.com/saw-cgi/eBayISAPI.dll?SignIn&runame=Zoovy-gtagruve-tly&ruparams='+encodeURIComponent('linkFrom=ebay-token&partner=EBAY&trigger=adminPartnerSet&sb=1') : 'https://signin.ebay.com/saw-cgi/eBayISAPI.dll?SignIn&runame=Zoovy-gtagruv3-ronj&ruparams='+encodeURIComponent('linkFrom=ebay-token&partner=EBAY&trigger=adminPartnerSet')
					linkOffSite(url); //ruparams are what we get back on the URI, as well as ebaytkn, tknexp and username (which is the ebay username).
					});
				}, //ebayTokenLinkTo

			amazonMWSLinkTo : function($btn)	{
				$btn.button();
				$btn.off('click.amazonMWSLinkTo').on('click.amazonMWSLinkTo',function(event){
					event.preventDefault();
					window.location = "https://sellercentral.amazon.com/gp/maws/maws-registration.html?ie=UTF8&amp;id=APF889O5V4GVL&amp;userType=web&amp;returnUrl="
					+ encodeURIComponent(window.location.href.split('?')[0]+"?linkFrom=amazon-token&PRT="+app.vars.partition)
					});
				}, //amazonMWSLinkTo

//clicked when editing an option for a 'select' type. resets and populates inputs so option can be edited.
			amazonThesaurasEdit : function($btn)	{
				$btn.button({icons: {primary: "ui-icon-pencil"},text: false});

				$btn.off('click.variationUpdateShow').on('click.variationUpdateShow',function(){
					var $tr = $btn.closest('tr');
//guid is required for 'edit' and dataTable.
					if($tr.data('guid'))	{} //already has a guid, do nothing.
					else	{$tr.attr('data-guid',app.u.guidGenerator())} 
					
					$btn.closest('fieldset').find('input, textarea').val("");
					$btn.closest('fieldset').find("[data-app-role='thesaurusDataTableInputs']").anycontent({'data':$tr.data()}).find(':checkbox').anycb('update');
					})
				}, //variationOptionUpdateShow


			showDSTDetail : function($ele)	{
				$ele.off('click.showDSTDetail').on('click.showDSTDetail',function(){
					var $mktContainer = $ele.closest("[data-app-role='syndicationContainer']").find("[data-app-role='slimLeftContentSection']").first();
					if($ele.data('mkt'))	{
						app.ext.admin_syndication.a.showDSTDetails($ele.data('mkt'),$mktContainer)
						}
					else	{
						$mktContainer.anymessage({"message":"In admin_syndication.e.showDSTDetail, unable to determine mkt.","gMessage":true});
						}
					});
				}, //showDSTDetail


			ebayServiceAddShow : function($btn)	{
				$btn.button()
				$btn.off('click.ebayHTMLEditorAddImage').on('click.ebayHTMLEditorAddImage',function(){
					$btn.hide();
					$btn.closest('fieldset').find("[data-app-role='addServiceInputs']").slideDown();
					});
				}, //ebayServiceAddShow

			adminEBAYProfileZipDownloadExec : function($btn)	{
				$btn.button();
				$btn.off('click.adminEBAYProfileZipDownload').on('click.adminEBAYProfileZipDownload',function(){
					var profile = $btn.data('profile');
					$(app.u.jqSelector('#',app.ext.admin.vars.tab+'Content')).showLoading({'message':'Building a zip file of the template. One moment please...'});
					app.model.addDispatchToQ({
						'_cmd' : 'adminEBAYProfileZipDownload',
						'base64' : true,
						'PROFILE' : profile,
						'FILENAME' : profile+'.zip',
						'_tag' : {
							'callback':'fileDownloadInModal',
							'extension':'admin',
							'datapointer':'adminEBAYProfileZipDownload|'+profile,
							'jqObj' : $(app.u.jqSelector('#',app.ext.admin.vars.tab+'Content'))
							}
						},'immutable');
					app.model.dispatchThis('immutable');
					});
				}, //adminEBAYProfileZipDownloadExec

			adminEBAYProfileZipUploadExec : function($btn)	{
				$btn.button();
				$btn.off('click.adminEBAYProfileZipUploadExec').on('click.adminEBAYProfileZipUploadExec',function(){
					var profile = $btn.data('profile');
					var $D = app.ext.admin.i.dialogCreate({
						'title' : 'eBay Template Zip File Upload',
						'templateID' : 'ebayZipUploadTemplate',
						data : {} //blank data because translation needs to occur (template calls another template)
						});
					$D.dialog('option','height','400');
					$('form',$D).append("<input type='hidden' name='profile' value='"+profile+"' \/>");
					$D.dialog('open');
					app.ext.admin_medialib.u.convertFormToJQFU($('form',$D),'adminEBAYProfileFileUpload');
					});
				}, //adminEBAYProfileZipUploadExec


			ebayBuyerRequirementsToggle : function($ele)	{
				function handleSelect()	{
					if($ele.val() == 1)	{
						$('.toggleThis',$ele.closest('fieldset')).show();
						}
					else	{
						$('.toggleThis',$ele.closest('fieldset')).hide();
						}
					}
				handleSelect();
				$ele.off('click.hideInputsByCheckbox').on('click.hideInputsByCheckbox',function(){
					handleSelect();
					});
				}, //ebayBuyerRequirementsToggle



			ebayAutopayToggle : function($ele)	{
				function handleCB()	{
					if($ele.is(':checked'))	{
						$("[data-app-role='eBayPaymentMethods']",$ele.closest('fieldset')).hide();
						}
					else	{
						$("[data-app-role='eBayPaymentMethods']",$ele.closest('fieldset')).show();;
						}
					}
				handleCB();
				$ele.off('click.hideInputsByCheckbox').on('click.hideInputsByCheckbox',function(){
					handleCB();
					});
				}, //ebayBuyerRequirementsToggle

			adminSyndicationMacroExec : function($btn)	{
				$btn.button();
				$btn.off('click.adminSyndicationMacroExec').on('click.adminSyndicationMacroExec',function(){
					var $form = $btn.closest('form');
					if(app.u.validateForm($form))	{
						
						var macros = new Array(),
						$form = $btn.closest('form'),
						sfo = $form.serializeJSON({'cb':true}) || {},
						DST = sfo.DST; //shortcut.
						
						if(DST)	{
							for(var index in sfo)	{
								if(index == 'ENABLE')	{
									if(sfo[index] >= 1)	{macros.push("ENABLE")}
									else	{macros.push("DISABLE")}	
									}
								else	{
									//no other special treatment... yet
									}
								}

							macros.push("SAVE?"+$.param(sfo));

							if(DST == 'AMZ')	{
								$('tr.edited',$form).each(function(){
									var $tr = $(this);
									if($tr.hasClass('rowTaggedForRemove') && $tr.hasClass('isNewRow'))	{
										//if it's a new row that was deleted before a save occured, no macro needed to remove it.
										}
									else if($tr.hasClass('rowTaggedForRemove'))	{
										macros.push("AMZ-THESAURUS-DELETE?ID="+$tr.data('thid'));
										}
									else if($tr.hasClass('isNewRow'))	{
										macros.push("AMZ-THESAURUS-SAVE?"+app.ext.admin.u.getSanitizedKVPFromObject($tr.data()));
										}
									else	{
										//HUH! shouldn't have gotten here.
										$('#globalMessaging').anymessage({'message':'in admin_syndication.e.adminSyndicationMacroExec, unknown case for amazon thesaurus. Does not appear to be new or delete, why is it flagged as edited?','gMessage':true});
										}
									});
								}
							app.u.dump("macros: "); app.u.dump(macros);
							$form.showLoading({'message':'Updating Marketplace Settings...'});
							app.ext.admin.calls.adminSyndicationMacro.init(DST,macros,{'callback':'handleMacroUpdate','extension':'admin_syndication','jqObj':$form},'immutable');
							app.ext.admin.calls.adminSyndicationDetail.init(DST,{},'immutable');
							app.model.dispatchThis('immutable');

							}
						else	{
							$form.anymessage({"message":"In admin_syndication.u.adminSyndicationMacroExec, unable to determine DST ["+DST+"] or macros ["+macros.length+"] was empty","gMessage":true});
							}		
						}
					else	{} //validateForm handles error display.
					});
				}, //adminSyndicationMacroExec

			adminSyndicationUnsuspendMacro : function($btn)	{
				$btn.button();
				$btn.off('click.adminSyndicationUnsuspendMacro').on('click.adminSyndicationUnsuspendMacro',function(){
					DST = $btn.closest("[data-dst]").data('dst');
					if(DST)	{
						app.ext.admin.calls.adminSyndicationMacro.init(DST,['UNSUSPEND'],{},'immutable');
						app.model.dispatchThis('immutable');
						}
					else	{
						$form.anymessage({"message":"In admin_syndication.u.handleDSTDetailSave, unable to determine DST ["+DST+"] or macros ["+macros.length+"] was empty","gMessage":true});
						}
					});
				}, //adminSyndicationUnsuspendMacro

			adminSyndicationUnsuspendAndClearErrorMacro : function($btn)	{
				$btn.button();
				$btn.off('click.adminSyndicationUnsuspendMacro').on('click.adminSyndicationUnsuspendMacro',function(){
					DST = btn.closest("[data-dst]").data('dst');
					if(DST)	{
						app.ext.admin.calls.adminSyndicationMacro.init(DST,['UNSUSPEND','CLEAR-FEED-ERRORS'],{},'immutable');
						app.model.dispatchThis('immutable');
						}
					else	{
						$form.anymessage({"message":"In admin_syndication.u.handleDSTDetailSave, unable to determine DST ["+DST+"] or macros ["+macros.length+"] was empty","gMessage":true});
						}
					});
				}, //adminSyndicationUnsuspendAndClearErrorMacro

			adminSyndicationPublishExec : function($btn)	{
				$btn.button();
				var
					$form = $btn.closest('form'),
					DST = $("[name='DST']",$form).val();
					
//the markeplace must be enabled prior to publishing. That change needs to be saved, then the button will unlock.
//that ensures all information required for syndication is provided.
				if(DST && app.data['adminSyndicationDetail|'+DST])	{
					if(Number(app.data['adminSyndicationDetail|'+DST].enable) >= 1)	{
						$btn.button('enable');
						}
					else	{
						$btn.button('disable');
						}
					}
				//"adminSyndicationPublish"
				$btn.off('click.adminSyndicationPublishExec').on('click.adminSyndicationPublishExec',function(){
					var sfo = $form.serializeJSON({'cb':true});
					
					if(sfo.DST)	{
						if(sfo.ENABLE)	{
							if(app.u.validateForm($form))	{
								$form.showLoading({"message":"Creating batch job for syndication feed publication..."});
								
								app.model.addDispatchToQ({
									'_cmd' : 'adminSyndicationPublish',
									'DST' : sfo.DST,
									'FEEDTYPE' : 'PRODUCT',
									'_tag' : {
										'callback':'showBatchJobStatus',
										'extension':'admin_batchJob',
										'datapointer' : 'adminBatchJobStatus',
										'jqObj':$form}
									},'immutable');
								app.model.dispatchThis('immutable');
								}
							else	{} //validate form handles display errors.

							}
						else	{
							$form.anymessage({"message":"Before you can publish to this marketplace you must enable it."});
							}
						}
					else	{
						$form.anymessage({"message":"In admin.e.adminSyndicationPublishExec, unable to ascertain DST, which is required to proceed.","gMessage":true});
						}
					
					})
				}, //adminSyndicationPublishExec

			amazonThesaurusAddShow : function($btn)	{
				$btn.button();
				$btn.off('click.amazonThesaurusAddShow').on('click.amazonThesaurusAddShow',function(event){
					event.preventDefault();
					var $D = $("<div \/>").attr('title',"Add Thesaurus");
					$D.anycontent({'templateID':'syndicationAmazonThesaurasAdd','data':{}});
					$D.addClass('displayNone').appendTo('body'); 
					$D.dialog({
						modal: true,
						width: '90%',
						autoOpen: false,
						close: function(event, ui)	{
							$(this).dialog('destroy').remove();
							}
						});
//					$(':checkbox',$D).anycb(); //{'text' : {'on' : 'yes','off':'no'}} //not working in a dialog for some reason.
					$D.dialog('open');

					});
//				
				}, //amazonThesaurusAddShow

			adminSyndicationDebugExec : function($btn)	{
				$btn.button();
				$btn.off('click.adminSyndicationDebugExec').on('click.adminSyndicationDebugExec',function(){
					var
						$form = $btn.closest('form'),
						$container = $btn.closest("[data-app-role='syndicationDetailContainer']"),
						DST = $btn.closest("[data-dst]").data('dst');
					
					if(DST)	{
						if(app.u.validateForm($form))	{
							app.ext.admin.calls.adminSyndicationDebug.init(DST,$form.serializeJSON(),{callback : function(rd){
if(app.model.responseHasErrors(rd)){
	$container.anymessage({'message':rd})
	}
else	{
	$("[data-app-role='diagnosticsResultsContainer']",$container).html(app.data[rd.datapointer]['HTML']);
	}
								}},'mutable');
							app.model.dispatchThis('mutable');
							}
						else	{
							//validateForm handles error display.
							}
						}
					else	{
						$form.anymessage({"message":"In admin.e.adminSyndicationDebugExec, unable to ascertain DST, which is required to proceed.","gMessage":true});
						}
					});
				} //adminSyndicationDebugExec
			
			} //e [app Events]
		} //r object.
	return r;
	}