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

/*

on the navcat object, save a 'data' for the array of 'whats checked'.  Then, when a tree is opened or closed, look at that array to see what should be prechecked.
also, add a button for 'show all the checked categories'.


*/

var admin_navcats = function() {
	var theseTemplates = new Array('catTreeItemTemplate');
	var r = {


////////////////////////////////////   CALLBACKS    \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\



	callbacks : {
//executed when extension is loaded. should include any validation that needs to occur.
		init : {
			onSuccess : function()	{
				var r = false; //return false if extension won't load for some reason (account config, dependencies, etc).
				app.model.fetchNLoadTemplates(app.vars.baseURL+'extensions/admin/navcats.html',theseTemplates);
				//if there is any functionality required for this extension to load, put it here. such as a check for async google, the FB object, etc. return false if dependencies are not present. don't check for other extensions.
				r = true;

				return r;
				},
			onError : function()	{
//errors will get reported for this callback as part of the extensions loading.  This is here for extra error handling purposes.
//you may or may not need it.
				app.u.dump('BEGIN admin_orders.callbacks.init.onError');
				}
			}
		}, //callbacks



////////////////////////////////////   ACTION    \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

//actions are functions triggered by a user interaction, such as a click/tap.
//these are going the way of the do do, in favor of app events. new extensions should have few (if any) actions.
		a : {

			}, //Actions

////////////////////////////////////   RENDERFORMATS    \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

//renderFormats are what is used to actually output data.
//on a data-bind, format: is equal to a renderformat. extension: tells the rendering engine where to look for the renderFormat.
//that way, two render formats named the same (but in different extensions) don't overwrite each other.
		renderFormats : {
			openSubcatsIcon : function($tag,data)	{
				if(data.value['@subcategories'].length)	{
					$tag.attr('data-app-action','admin_navcats|navcatSubsShow').removeClass('opacity50').addClass('pointer');
					}
				}
			}, //renderFormats
////////////////////////////////////   UTIL [u]   \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


		u : {
//subcats is an array of safe ID's.
//Container is the parent of where the list will be generated.  typically a tbody or ul.
//vars MUST contain templateID.
//vars.fetchonly allows for getTree to 'get' all the data, but not display it right away. used when tree initially loads.
			getSubcats : function(subcats,$container,vars)	{
				vars = vars || {};
				if(subcats && (($container instanceof jQuery  && vars.templateID) || vars.fetchOnly)) {
				
					var
						L = subcats.length,
						navcatObj = app.ext.admin.u.dpsGet('navcat','tree4prt'+app.vars.partition), //list of 'open' categories from localStorage.
						NOL = navcatObj.length;

//					app.u.dump(' -> navcatObj: '); app.u.dump(navcatObj);
					for(var i = 0; i < L; i += 1)	{
//						app.u.dump(" -> subcats[i]: "+subcats[i]+" and fetchonly: "+vars.fetchOnly);
						var
							$cat = vars.fetchOnly ? '' : app.renderFunctions.createTemplateInstance(vars.templateID,{"catsafeid":subcats[i]}),
							datapointer = 'adminNavcatDetail|'+app.vars.partition+'|'+subcats[i]
						
						if(vars.fetchOnly)	{}
						else	{$container.append($cat)}

						var _tag = {
							'path' : subcats[i],
							'callback': vars.fetchOnly ? false : function(rd){
								if(app.model.responseHasErrors(rd)){
									$('#globalMessaging').anymessage({'message':rd});
									}
								else	{
									
									app.callbacks.anycontent.onSuccess(rd); //translate the tree.
//if the category is 'open' in DPS, trigger the click to show the subcats (which will already have been loaded in memory by now)
										if($.inArray(rd.path,navcatObj) >= 0)	{
//											app.u.dump(" Match! "+rd.path);
											$("[data-catsafeid='"+rd.path+"']",$container).find("[data-app-action='admin_navcats|navcatSubsShow']").first().trigger('click',{'isInit':vars.isInit});
										}
									}
								},
							'datapointer':datapointer,
							'jqObj':vars.fetchOnly ? '' : $cat}
						
//						app.u.dump(" -> typeof callback: "+typeof _tag.callback);
					//hhhmmm....  if this is going to be used a lot, we may want to do a 'call' for it to reduce if/else
						if(app.model.fetchData(datapointer))	{
							app.u.handleCallback(_tag);
							}
						else	{
							app.model.addDispatchToQ({
								'path':subcats[i],
								'detail':'more',
								'navtree' : 'PRT00'+app.vars.partition,
								'_cmd': 'adminNavcatDetail',
								'_tag' : _tag
								},'mutable');
							}
							
//						app.calls.appNavcatDetail.init({'safe':subcats[i],'detail':'more'},{'callback':'anycontent','jqObj':$cat},'mutable');
						}
					app.model.dispatchThis('mutable');
					}
				else	{
						$('#globalMessaging').anymessage({'message':"In admin_navcats.u.getSubcats, either subcats ["+typeof subcats+"], $container ["+($container instanceof jQuery)+"] or vars.templateID ["+vars.templateID+"] was not set and all three are required.",'gMessage':true})
					}
				
				},

/*
This is what gets run to display a category tree.  
this should only be run once within a 'selector' (meaning don't re-run this for each subcat set, use getSubcats)
Params:
	mode could be:  builder, chooser
	vars:
		navtree -> required. the root level category of this tree
		templateID -> required. the template to be used for each category (list item)
		safeIDs -> an array of safe id's. each of these will be 'checked' (enabled, turned on, whatever)
	
*/
			getTree : function(mode,vars){
//				app.u.dump("BEGIN admin_navcats.u.getTree");
				var $tree = $("<div \/>").attr('data-app-role','categoryTree').data(vars).data('mode',mode);
				vars = vars || {};

				//set some defaults.
				if(mode)	{
					if(vars.templateID && vars.navtree)	{
						$tree.showLoading({'message':'Fetching category tree'});

						var navcatObj = app.ext.admin.u.dpsGet('navcat','tree4prt'+app.vars.partition);
//						app.u.dump(' -> navcatObj (list of cats that should be "open": '); app.u.dump(navcatObj);


						var $ul = $("<ul class='noPadOrMargin listStyleNone' \/>").attr('data-app-role','categories');
						$ul.appendTo($tree);

						app.ext.admin_navcats.u.getSubcats(navcatObj,"",{fetchOnly:true}); //get all the 'open' category data handy.
						//all required params are present/set. proceed.
						app.model.addDispatchToQ({
							'detail':'more',
							'_cmd': 'adminNavcatDetail',
							'path' : vars.navtree,
							'navtree' : 'PRT00'+app.vars.partition,
							'_tag' : {
								'callback':function(rd){
									$tree.hideLoading();
									if(app.model.responseHasErrors(rd)){
										$tree.anymessage({'message':rd});
										}
									else	{
										app.ext.admin_navcats.u.getSubcats(app.data[rd.datapointer]['@subcategories'],$ul,vars);
										}
									},
								'datapointer':'adminNavList|'+app.vars.partition+"|"+vars.navtree
								}
							},'mutable');

						app.model.dispatchThis('mutable');
						app.ext.admin_navcats.u.handleCatTreeDelegation($tree);
						}
					else	{
						$tree.anymessage({'message':'In admin_navcats.u.getTree, vars.templateID ['+vars.templateID+'] not set or invalid.','gMessage':true});
						}

					}
				else	{
					$tree.anymessage({'message':'In admin_navcats.u.getTree, mode ['+mode+'] not set or invalid.','gMessage':true});
					}
				
				return $tree;
				},
			
			handleCatTreeDelegation : function($tree)	{
				$tree.on('click',function(e,p){
					p = p || {}; //
					var $target = $(e.target);
					if($target.data('app-action'))	{
//						app.u.dump(" -> $target.data('app-action'): "+$target.data('app-action'));
						var
							actionExtension = $target.data('app-action').split('|')[0],
							actionFunction =  $target.data('app-action').split('|')[1];
						
						if(actionExtension && actionFunction)	{
							if(app.ext[actionExtension].e[actionFunction] && typeof app.ext[actionExtension].e[actionFunction] === 'function')	{
//execute the app event.
								app.ext[actionExtension].e[actionFunction]($target,p);
								}
							else	{
								$('#globalMessaging').anymessage({'message':"In admin_navcats.u.handleCatTreeDelegation, extension ["+actionExtension+"] and function["+actionFunction+"] both passed, but the function does not exist within that extension.",'gMessage':true})
								}
							}
						else	{
							$('#globalMessaging').anymessage({'message':"In admin_navcats.u.handleCatTreeDelegation, app-action ["+$target.data('app-action')+"] is invalid.",'gMessage':true})
							}
						
						}
					});
				}
			
			}, //u [utilities]

		e : {
			
//triggered when a category is clicked opened or closed.
//will show/load or hide the category as needed.  Will also update DPS so that the next time the user comes into the category editor, 
//anything that was open will auto-open in the current session.
//p.isInit is passed in on the initial load in order to skip the DPS update, which isn't needed because the click is triggered by the app (to reopen open cats)
			navcatSubsShow : function($ele,p)	{
				app.u.dump("BEGIN admin_navcats.e.navcatSubsShow");
//				app.u.dump(" -> p: "); app.u.dump(p);
					p = p || {};
					var
						$subcats = $ele.closest('li').find("[data-app-role='categories']"),
						path = $ele.closest('li').data('catsafeid'),
						$icon = $ele.closest('li').find('.ui-icon:first');
					
					if(path)	{
						var navcatObj = app.ext.admin.u.dpsGet('navcat','tree4prt'+app.vars.partition) || new Array();
//						app.u.dump(' -> path: '+path);

// a function for adding or removing a category from the list of what's open by default.
// On the initial load, p.isInit will be true. In this case, DPS modification does NOT occur because the click is triggered automatically, not by a user interaction.
function handleDPS(cmd)	{
	if(p.isInit)	{}
	else	{
	
		var index = $.inArray(path,navcatObj);
	//	app.u.dump(" -> cmd: "+cmd);
	//	app.u.dump(" -> index: "+index);
		if((cmd == 'remove' && index < 0) || (cmd == 'add' && index >= 0))	{
			//do nothing. array already reflects cmd.
	//		app.u.dump("NO ACTION NECESSARY FOR "+path);
			} 
		else if(cmd == 'remove')	{
	//		app.u.dump("REMOVE "+path);
			navcatObj.splice(index,1);
			app.ext.admin.u.dpsSet('navcat','tree4prt'+app.vars.partition,navcatObj);
			}
		else if(cmd == 'add' && index < 0){
			navcatObj.push(path);
			app.ext.admin.u.dpsSet('navcat','tree4prt'+app.vars.partition,navcatObj);
			}
		else	{
			app.u.dump("handleDPS in navcatSubsShow had an invalid CMD passed or some unexpected condition was met.",'warn');
			}
		}
//	app.u.dump(" -> navcatObj: "); app.u.dump(navcatObj);
	}

						if($subcats.length)	{
							if($subcats.children().length)	{
								//subcats have already been rendered. not an error, just handled differently.
								if($subcats.is(':visible'))	{
									$icon.removeClass('ui-icon-circle-triangle-s').addClass('ui-icon-circle-triangle-e');
									handleDPS('remove');
									}
								else	{
									$icon.removeClass('ui-icon-circle-triangle-e').addClass('ui-icon-circle-triangle-s')
									handleDPS('add');
									}
								$subcats.toggle('fast'); //putting the handleDPS code in the toggle oncomplete was causing it to be executed multiple times
								
								}
							else	{
								var dp = 'adminNavcatDetail|'+app.vars.partition+'|'+path
//								app.u.dump(' -> datapointer: '+dp);
								if(app.data[dp])	{
									$icon.removeClass('ui-icon-circle-triangle-e').addClass('ui-icon-circle-triangle-s');
									handleDPS('add');
									app.ext.admin_navcats.u.getSubcats(app.data[dp]['@subcategories'],$subcats,{'templateID':$subcats.data('loadstemplate')});
									}
								else	{
									$('#globalMessaging').anymessage({'message':"In admin_navcats.e.navcatSubsShow, attempted to load app.data["+dp+"], which is not in memory.",'gMessage':true})
									}
								}
							}
						else	{$('#globalMessaging').anymessage({'message':"In admin_navcats.e.navcatSubsShow, no element with data-app-role='categories' exists (no destination for subcats",'gMessage':true})}
						}
					else	{$('#globalMessaging').anymessage({'message':"In admin_navcats.e.navcatSubsShow, unable to ascertain path/catsafeid.",'gMessage':true})}

				}, //navcatSubsShow
			
			
			} //e [app Events]
		} //r object.
	return r;
	}