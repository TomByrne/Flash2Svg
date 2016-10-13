package{

	import adobe.utils.MMEndCommand;
	import adobe.utils.MMExecute;

	import fl.controls.ProgressBarMode;
	import fl.events.ListEvent;
	import fl.data.DataProvider;

	import flash.events.*;
	import flash.external.ExternalInterface;
	import flash.text.*;
	import flash.utils.*;
	import flash.net.*;
	import flash.ui.*;


	import flash.display.*;
	import fl.containers.*;
	import fl.controls.*;

	import assets.ControlLayout;


	public class PanelRoot extends MovieClip{


		//private var timer:Timer=new Timer(1);
		private var isCanceled:Boolean=false;
		private var finished:Boolean=false;
		private var swfPanelName:String='SVG';


		private var controlsLayout:ControlLayout;
		private var controlsLogic:ControlsLogic;

		private var _dev:Boolean;

		public function get dev():Boolean{
			return _dev;
		}
		public function set dev(value:Boolean):void{
			_dev = value;
			context.customItems = _dev?[devModeOnItem]:[devModeOffItem];
			_panelSettings.updateSetting(this, "dev");

			MMExecute('extensible.dev = '+value);
		}

		private var context:ContextMenu;
		private var devModeOnItem:ContextMenuItem;
		private var devModeOffItem:ContextMenuItem;

		private var _panelSettings:SettingsSaver;
		private var _exportSettings:SettingsSaver;
		
		public function PanelRoot(){

			this.alpha = 0;


			controlsLayout = new ControlLayout();
			scrollPane.source = controlsLayout;

			controlsLogic = new ControlsLogic(controlsLayout);


			devModeOnItem = new ContextMenuItem("Turn dev mode off");
			devModeOnItem.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, toggleDevMode);

			devModeOffItem = new ContextMenuItem("Turn dev mode on");
			devModeOffItem.addEventListener(ContextMenuEvent.MENU_ITEM_SELECT, toggleDevMode);

			context = new ContextMenu();
			context.hideBuiltInItems();
			this.contextMenu = context;

			stage.align=StageAlign.TOP_LEFT;
			stage.scaleMode=StageScaleMode.NO_SCALE;


			var panelRef:PanelRoot = this;


			//Initialize Javascript
			_dev=(
				MMExecute([
					'if(!this.extensible){',
					'	fl.runScript(fl.configURI+"Javascript/Extensible/init.jsfl");',
					'}',
					'extensible.dev'
				].join('\n'))=='true'
			);
			_dev = true;
			var jsDir:String = MMExecute('extensible.dir');


			this.controlsLayout.sourceRow.input.dataProvider = new DataProvider([{label:'Current Timeline', showBoundsInput:false, 	data:"current"},
																			{label:'Selected Library Items', showBoundsInput:true, 	data:"libraryItems"}]);

			this.controlsLayout.framesRow.input.dataProvider = new DataProvider([{label:'All Frames', showFrameInput:false, 		data:"all"},
																			{label:'Current Frame', showFrameInput:false, 			data:"current"},
																			{label:'Custom Range', showFrameInput:true, 			data:"custom"}]);

			this.controlsLayout.outputRow.input.dataProvider = new DataProvider([{label:'Animated SVG', showFlattenMotion:true, 	data:"animation"},
																			{label:'SVG Images', showFlattenMotion:false, 			data:"images"}]);

			this.controlsLayout.masksRow.input.dataProvider = new DataProvider([{label:'Clipping', 			data:"clipping"},
																				{label:'Alpha', 			data:"alpha"},
																				{label:'Luminance', 		data:"luminance"}]);

			this.controlsLayout.curvesRow.input.dataProvider = new DataProvider([{label:'Quadratic', 		data:2},
																				 {label:'Cubic', 			data:3}]);

			this.controlsLayout.expandRow.input.dataProvider = new DataProvider([{label:'Once Used Symbols',data:"usedOnce"},
																				 {label:'All', 				data:"all"},
																				 {label:'None', 			data:"none"},
																				 {label:'Nested', 			data:"nested"}]);

			_panelSettings = new SettingsSaver(jsDir+'/Settings/SVGPanel/', true);
			_panelSettings.addSetting(this, "dev", "dev", _dev);
			_panelSettings.setSettingTitle("Settings", true);

			_exportSettings = new SettingsSaver(jsDir+'/Settings/SVG/', false, confirmOverwrite, "SVGExportOptions", this.swfPanelName);
			_exportSettings.addEventListener(SettingsSaver.EVENT_STATE_CHANGED, exportStateChanged);
			_exportSettings.addEventListener(SettingsSaver.EVENT_GROUPS_CHANGED, exportGroupsChanged);

			_exportSettings.addSetting(controlsLayout.fileRow.input, "text", "file", null, false, fileGetter, fileSetter, Event.CHANGE, false);
			_exportSettings.addSetting(controlsLayout.sourceRow.input, "selectedIndex", "source", "current", false, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.framesRow.input, "selectedIndex", "frames", "all", false, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.outputRow.input, "selectedIndex", "output", "animation", false, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.clippingRow.clipToScalingGridRadioButton, "selected", "clipToScalingGrid", false, false, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.clippingRow.clipToBoundingBoxRadioButton, "selected", "clipToBoundingBox", true, false, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.customFramesRow.startFrameNumericStepper, "value", "startFrame", 0, false, null, null, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.customFramesRow.endFrameNumericStepper, "value", "endFrame", 0, false, null, null, Event.CHANGE);

			_exportSettings.addSetting(controlsLayout.masksRow.input, "selectedIndex", "maskingType", "clipping", true, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.decimalRow.input, "value", "decimalPointPrecision", 3, true, null, null, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.curvesRow.input, "selectedIndex", "curveDegree", 2, true, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.expandRow.input, "selectedIndex", "expandSymbols", "usedOnce", true, comboGetter, comboSetter, Event.CHANGE, true, {All:"all", None:"none", Nested:"nested"});
			_exportSettings.addSetting(controlsLayout.beginRow.input, "selectedIndex", "beginAnimation", "0s", true, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.renderingRow.input, "selectedIndex", "rendering", "auto", true, comboGetter, comboSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.applyTransformationsCheckBox, "selected", "applyTransformations", true, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.convertPatternsToSymbolsCheckBox, "selected", "convertPatternsToSymbols", true, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.convertTextToOutlines, "selected", "convertTextToOutlines", true, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.flattenMotionCheckBox, "selected", "flattenMotion", false, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.includeBackgroundCheckBox, "selected", "includeBackground", false, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.loopCheckBox, "selected", "repeatCount", true, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.loopTweensCheckBox, "selected", "loopTweens", true, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.discreteEasingCheckBox, "selected", "discreteEasing", true, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.removeGroupsCheckBox, "selected", "removeGroups", true, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.compactOutputCheckBox, "selected", "compactOutput", true, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.avoidMiterCheckBox, "selected", "avoidMiter", true, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.useViewbox, "selected", "animatedViewBox", false, true, radioGetter, radioSetter, Event.CHANGE);
			_exportSettings.addSetting(controlsLayout.showFinalFrame, "selected", "showFinalFrame", false, true, radioGetter, radioSetter, Event.CHANGE);

			this.controlsLayout.flattenMotionCheckBox.addEventListener(Event.CHANGE, onFlattenMotionChanged);
			this.controlsLayout.discreteEasingCheckBox.addEventListener(Event.CHANGE, onDiscreteEasingChanged);

			this.controlsLayout.helpButton.addEventListener(MouseEvent.CLICK, onHelpClicked);

			exportGroupsChanged();

			if(_exportSettings.state==SettingsSaver.STATE_UNLOADED){
				_panelSettings.setToFirst(false);
			}
			
			//Inputs
			this.controlsLayout.fileRow.button.addEventListener(
				MouseEvent.CLICK,
				browseForFile
			);
			this.controlsLayout.presetRow.deleteButton.addEventListener(
				MouseEvent.CLICK,
				deletePreset
			);
			this.controlsLayout.presetRow.saveButton.addEventListener(
				MouseEvent.CLICK,
				savePreset
			);
			this.controlsLayout.presetRow.comboBox.addEventListener(
				Event.CHANGE,
				presetComboChange
			);
			this.controlsLayout.exportButton.addEventListener(
				MouseEvent.CLICK,
				exportSVG
			);
			this.controlsLayout.sourceRow.input.addEventListener(
				Event.CHANGE,
				onSourceChanged
			);
			this.controlsLayout.framesRow.input.addEventListener(
				Event.CHANGE,
				onFramesChanged
			);
			this.controlsLayout.outputRow.input.addEventListener(
				Event.CHANGE,
				onOutputChanged
			);
			//ProgressBar
			this.controlsLayout.progressBar.minimum=0;


			// Document change...
			ExternalInterface.addCallback('documentChanged',documentChanged);
			MMExecute([
				'fl.addEventListener(',
				'	"documentChanged",',
				'	function(){',
				'		extensible.swfPanel("'+swfPanelName+'").call("documentChanged");',
				'	}',
				');'
			].join('\n'));

			// Layer change...
			ExternalInterface.addCallback('layerChanged',documentChanged);
			MMExecute([
				'fl.addEventListener(',
				'	"layerChanged",',
				'	function(){',
				'		extensible.swfPanel("'+swfPanelName+'").call("layerChanged");',
				'	}',
				');'
			].join('\n'));


			documentChanged();

			_exportSettings.init();

			setTimeout(doIntro, 500); // delays allow components to initialise fully
		}

		private function documentChanged():void{
			DelayedCall.call(doDocumentChanged, 0.1); // flash calls the handler multiple times, this will collate them
		}

		public function doDocumentChanged():void{
			if(MMExecute('extensible.doc')=="null"){
				controlsLogic.setEnabled(false);
				//this.controlsLayout.fileRow.input.text = "";
				_exportSettings.setDefaultForSetting("file",null);
			}else{
				controlsLogic.setEnabled(true);
				var fileName;
				if(MMExecute('extensible.doc.pathURI')!=='undefined'){
					fileName = MMExecute('decodeURIComponent(extensible.doc.pathURI.relativeToDocument).stripExtension()');
				}else{
					fileName = MMExecute('extensible.doc.name.stripExtension()');
				}
				if(MMExecute('extensible.doc.getTimeline().libraryItem!=null')=='true' || MMExecute('extensible.doc.timelines.length>1')=='true'){
					fileName += "_"+MMExecute('extensible.doc.getTimeline().name');
				}
				fileName += ".svg";
				_exportSettings.setDefaultForSetting("file",fileName);
			}
			onSourceChanged();
			onFramesChanged();
			onOutputChanged();
			onFlattenMotionChanged();
		}

		private var _contHandler:Function;
		private function confirmOverwrite(contHandler:Function):void{
			_contHandler = contHandler;
			if(Fl.confirm("Are you sure?\nThis will overwrite the preset '"+_exportSettings.settingTitle+"'")){
				_contHandler();
			}
			_contHandler = null;
		}
		private function exportGroupsChanged(e:Event=null):void{
			var titles:Array = [];

			for each(var group in _exportSettings.settingsGroups){
				titles.push(group.title);
			}

			controlsLayout.presetRow.comboBox.dataProvider = new DataProvider(titles);
		}

		private function exportStateChanged(e:Event):void{
			var existing:SettingGroup = _exportSettings.getSettingGroup(_exportSettings.settingTitle);
			if(_exportSettings.state==SettingsSaver.STATE_MODIFIED){
				if(existing && !existing.userCreated){
					_exportSettings.setSettingTitle(null, false);
					return;
				}
			}
			if(_exportSettings.settingTitle){
				controlsLayout.presetRow.comboBox.text = _exportSettings.settingTitle;
			}else{
				controlsLayout.presetRow.comboBox.text = "";
			}
			controlsLayout.presetRow.saveButton.visible = (!existing || _exportSettings.state==SettingsSaver.STATE_MODIFIED || _exportSettings.state==SettingsSaver.STATE_UNSAVED);
			controlsLayout.presetRow.deleteButton.enabled = (!existing || !existing.userCreated);
			controlsLayout.presetRow.deleteButton.visible = (!controlsLayout.presetRow.saveButton.visible);
			controlsLayout.presetRow.deleteButton.enabled = (existing && existing.userCreated);
		}

		private function presetComboChange(e:Event){
			if(controlsLayout.presetRow.comboBox.selectedIndex==-1){
				_exportSettings.setSettingTitle(controlsLayout.presetRow.comboBox.text, true);
			}else{
				_exportSettings.setSettingTitle(controlsLayout.presetRow.comboBox.selectedItem.label, true);
			}
		}

		private function deletePreset(e:Event){
			_exportSettings.remove();
		}

		private function savePreset(e:Event){
			if(!_exportSettings.settingTitle){
				Fl.alert("Must add a title");
				stage.focus = controlsLayout.presetRow.comboBox;
			}else{
				_exportSettings.save();
			}
		}

		private function fileSetter(input:TextInput, prop:String, value:String):void{
			input.text = value?value:'';
		}
		private function fileGetter(input:TextInput, prop:String):String{
			return input.text==""?null:input.text
		}

		private function radioSetter(input:*, prop:String, value:*):void{
			input.selected = (value==true || value=="true"?true:false);
		}
		private function radioGetter(input:*, prop:String):Boolean{
			return input.selected;
		}

		private function comboSetter(combo:ComboBox, prop:String, value:String):void{
			for(var i=0;i<combo.length;i++){
				if(combo.getItemAt(i).data==value){
					combo.selectedIndex = i;
					return;
				}
			}
			Fl.log("WARNING: Unknown option '"+value+"' for property '"+prop+"'");
			combo.selectedIndex = -1;
		}
		private function comboGetter(combo:ComboBox, prop:String):String{
			return combo.selectedItem?combo.selectedItem.data:null;
		}

		private function toggleDevMode(e:Event):void{
			dev = !dev;
		}

		private function doIntro():void{
			// this initialises the controls
			controlsLogic.setSize(scrollPane.width-(scrollPane.verticalScrollBar.visible?15:0), scrollPane.height);
			controlsLogic.update();

			this.alpha = 1;

			stage.addEventListener(Event.RESIZE,onStageResize);
			onStageResize();
		}

		private function onStageResize(e:Event=null):void{
			scrollPane.setSize(stage.stageWidth, stage.stageHeight);
			controlsLogic.setSize(stage.stageWidth-(scrollPane.verticalScrollBar.visible?15:0), stage.stageHeight);
		}
		
		private function browseForFile(e:MouseEvent){
			var fileURI:String=MMExecute('fl.browseForFileURL("save","Export")');
			if(fileURI == "null")return;

			fileURI = MMExecute('FLfile.uriToPlatformPath("'+fileURI+'")');
			if(MMExecute('extensible.doc.path')!=='undefined'){
				var docURI = MMExecute('extensible.doc.path');
				var relativePath:String = findRelativePath(fileURI, docURI, 3);
				if(relativePath){
					fileURI = relativePath;
				}
			}
			this.controlsLayout.fileRow.input.text = fileURI;
			_exportSettings.updateSetting(controlsLayout.fileRow.input, "text");
		}

		private function isUnixPaths():Boolean{
			return MMExecute('fl.configDirectory.charAt(0)')=="/";
		}

		private function findRelativePath(path:String, toPath:String, goUpLevels:int):String{
			var slashType:String = isUnixPaths() ? "/" : "\\";

			var slash:int = toPath.lastIndexOf(slashType);
			if(slash==-1)return path;
			toPath = toPath.substr(0, slash);

			var levels:int = 0;
			var levelPath:String = "";
			do{
				if(path.indexOf(toPath)==0){
					return levelPath + path.substr(toPath.length+1);
				}
				slash = toPath.lastIndexOf(slashType);
				toPath = toPath.substr(0, slash);

				++levels;
				levelPath += ".."+slashType;
			}while(levels < goUpLevels)

			return null;
		}

		private function resolveRelativePath(path:String, toPath:String):String{
			var slashType:String = isUnixPaths() ? "/" : "\\";

			var upLevel:String = ".."+slashType;
			var levels:int = 0;
			while(path.indexOf(upLevel)==0){
				path = path.substr(upLevel.length);
				levels++;
			}


			var slash:int = toPath.lastIndexOf(slashType);
			if(slash==-1)return path;
			toPath = toPath.substr(0, slash);

			var level:int = 0;
			while(level < levels){
				slash = toPath.lastIndexOf(slashType);
				toPath = toPath.substr(0, slash);
				++level;
			}
			return toPath + slashType + path;
		}

		private function isRelativePath(path:String):Boolean{
			if(isUnixPaths()){
				return path.charAt(0)!="/";
			}else{
				return path.charAt(1)!=":";
			}
		}
		
		private function onSourceChanged(e:Event=null):void{
			this.controlsLayout.clippingRow.visible = (this.controlsLayout.sourceRow.input.selectedItem && this.controlsLayout.sourceRow.input.selectedItem.showBoundsInput);
			controlsLogic.update();
		}
		private function onFramesChanged(e:Event=null):void{
			this.controlsLayout.customFramesRow.visible = (this.controlsLayout.framesRow.input.selectedItem && this.controlsLayout.framesRow.input.selectedItem.showFrameInput);
			controlsLogic.update();
		}
		private function onOutputChanged(e:Event=null):void{
			if(this.controlsLayout.outputRow.input.selectedIndex==-1)this.controlsLayout.outputRow.input.selectedIndex = 0;

			var isAnim:Boolean = (this.controlsLayout.outputRow.input.selectedItem && this.controlsLayout.outputRow.input.selectedItem.showFlattenMotion);
			this.controlsLayout.beginRow.visible = isAnim;
			this.controlsLayout.flattenMotionCheckBox.visible = isAnim;
			this.controlsLayout.loopCheckBox.visible = isAnim;
			this.controlsLayout.discreteEasingCheckBox.visible = isAnim;
			this.controlsLayout.loopTweensCheckBox.visible = isAnim;
			this.controlsLayout.applyTransformationsCheckBox.visible = !isAnim;
			this.controlsLayout.useViewbox.visible = isAnim;
			controlsLogic.update();
		}
		private function onFlattenMotionChanged(e:Event=null):void{
			this.controlsLayout.discreteEasingCheckBox.enabled = this.controlsLayout.flattenMotionCheckBox.selected;
			onDiscreteEasingChanged();
		}
		private function onDiscreteEasingChanged(e:Event=null):void{
			this.controlsLayout.loopTweensCheckBox.enabled = !this.controlsLayout.discreteEasingCheckBox.enabled || !this.controlsLayout.discreteEasingCheckBox.selected;
		}
		private function onHelpClicked(e:Event):void{
			MMExecute('fl.getDocumentDOM().xmlPanel(fl.configURI + "/WindowSWF/svg-help.xml")');
		}
		
		private function exportSVG(e:Event):void
		{
			var filePath = _exportSettings.getSetting("file");
			if(isRelativePath(filePath)){
				var docPath:String = MMExecute('extensible.doc.path');
				if(docPath=='undefined'){
					Fl.alert("Please specify an absolute path or save the flash file");
					return;
				}else{
					filePath = resolveRelativePath(filePath, docPath);
				}
			}
			filePath = filePath.split("\\").join("\\\\");
			var fileURI:String = MMExecute('FLfile.platformPathToURI("'+filePath+'")');

			this.controlsLogic.setEnabled(false);
			this.isCanceled=this.finished=false;
			//Switch exportBttn to 'Cancel'
			this.controlsLayout.exportButton.label='Cancel';
			this.controlsLayout.exportButton.removeEventListener(
				MouseEvent.CLICK,
				exportSVG
			);
			this.controlsLayout.exportButton.addEventListener(
				MouseEvent.CLICK,
				cancel
			);
			// Show indeterminate bar until progress starts...
			this.controlsLayout.progressBar.indeterminate=true;
			this.controlsLayout.progressBar.mode = ProgressBarMode.EVENT;
			//ExternalInterface.addCallback('setProgress',setProgress);
			ExternalInterface.addCallback('endProgress',endProgress);
			//Save options
			var xml:XML = _exportSettings.getXml(true, {file:fileURI});
			xml.appendChild(<traceLog>{_dev}</traceLog>);
			xml['swfPanelName']='SVG';
			if(dev){
				MMExecute([
					'if(extensible && extensible.builderURI){',
					'	fl.runScript(extensible.builderURI);',
					'}',
					'fl.runScript(fl.configURI+"Javascript/Extensible/init.jsfl");'
				].join('\n'));
			}
			var cmd=[
				'extensible.que.push(',
				'	new extensible.SVG(',
						xml.toXMLString(),
				'	)',
				');'
			].join('\n');
			MMExecute(cmd);

			this.addEventListener(Event.ENTER_FRAME, processQue);
		}
		private function cancel(e:Event):void
		{
			this.controlsLogic.setEnabled(true);
			if(this.isCanceled||this.finished){return;}
			this.isCanceled=true;
			this.endProgress();
			var killed;
			try{
				killed=MMExecute('extensible.que.kill()');
			}catch(e){}
			/*if(!killed=='true'){ // If kill command does not return "true"
				this.controlsLayout.progressBar.setProgress(0,100);
			}*/
			Fl.log("SVG Export Failed");
		}
		
		private function processQue(e:Event):void
		{
			if(this.isCanceled||this.finished){return;}
			//if(this.timer.delay<100){this.timer.delay=100;}
			// attempt to process the que
			var success,err;
			try{
				success=MMExecute('extensible.que.process()');
			}catch(err){
				Fl.log("processQue.err: "+err);
			}
			/*if(success=='true'){
				this.timer.stop();
			}else{ // increase the delay with each failure
				if(this.timer.delay>120){
					this.cancel(e);
				}
				this.timer.delay+=20;
			}*/
		}
		
		/*public function setProgress(completed:Number,max:Number):Boolean
		{
			this.controlsLayout.progressBar.indeterminate=false;
			this.controlsLayout.progressBar.mode=ProgressBarMode.MANUAL;
			this.controlsLayout.progressBar.setProgress(completed,max);
			// this is a total hack
			this.timer=new Timer(0);
			this.timer.addEventListener(
				TimerEvent.TIMER,
				processQue
			);
			this.timer.addEventListener(
				TimerEvent.TIMER_COMPLETE,
				function(e:Event){this.endProgress();}
			);
			this.timer.start();
			return true;
		}*/
		
		public function endProgress():Boolean
		{
			this.removeEventListener(Event.ENTER_FRAME, processQue);
			this.controlsLogic.setEnabled(true);
			this.controlsLayout.progressBar.indeterminate=false;
			this.controlsLayout.progressBar.mode=ProgressBarMode.MANUAL;
			// return exportBttn to original state
			this.controlsLayout.exportButton.label='Export';
			this.controlsLayout.exportButton.removeEventListener(
				MouseEvent.CLICK,
				cancel
			);
			this.controlsLayout.exportButton.addEventListener(
				MouseEvent.CLICK,
				exportSVG
			);
			//ExternalInterface.addCallback('setProgress',null);
			ExternalInterface.addCallback('endProgress',null);
			/*if(this.timer){
				this.timer.stop();
			}*/
			/*if(!this.isCanceled){
				this.setProgress(100,100);
			}*/
			return true;
		}
	}

}