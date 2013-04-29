package{

	import adobe.utils.MMEndCommand;
	import adobe.utils.MMExecute;

	public class SettingsSaver {

		public static const STATE_UNLOADED:String = "unloaded";
		public static const STATE_LOADING:String = "loading";
		public static const STATE_LOADED:String = "loaded";
		public static const STATE_MODIFIED:String = "modified"; // not saved, exists on disk
		public static const STATE_UNSAVED:String = "unsaved";   // not saved, doesn't exist on disk
		public static const STATE_SAVING:String = "saving";



		public function get settingTitle():String{
			return _currentSettings.title;
		}

		public function get settingsGroups():Vector.<SettingGroup>{
			return _settingsGroups;
		}


		private var _currentSettings:SettingGroup;
		private var _settingsGroups:Vector.<SettingGroup>;
		private var _settingsDefs:Vector.<SettingDefinition>;

		private var _settingsFolder:String;
		private var _overwriteHandler:Function;
		private var _autoSave:Boolean;

		private var _state:String = STATE_UNLOADED;

		public function SettingsSaver(settingsFolder:String, autoSave:Boolean=false, overwriteHandler:Function=null){
			_currentSettings = new SettingGroup();

			_settingsDefs = new Vector.<SettingDefinition>();

			_settingsGroups = new Vector.<SettingGroup>();

			_settingsFolder = settingsFolder;
			_overwriteHandler = overwriteHandler;
			_autoSave = autoSave;

			if(MMExecute('FLfile.exists("'+settingsFolder+'")')!=='false'){
				var files:Array=MMExecute('FLfile.listFolder("'+settingsFolder+'","files")').split(',');
				for(var n=0;n<files.length;n++){
					var file:String = files[n];
					if(!file.length)break;

					var fileData = MMExecute('FLfile.read("'+settingsFolder+file+'")');
					if(fileData.length==0)continue;

					try{
						var xml:XML = new XML(fileData);
					}catch(e:Error){
						// bad settings file
						continue;
					}

					_settingsGroups.push(deserialise(xml));
				}
			}else{
				MMExecute('FLfile.createFolder("'+settingsFolder+'")')
			}
		}

		private function deserialise(xml:XML):SettingGroup{
			var ret = new SettingGroup(xml.@title);
			for each(var child in xml.children()){
				var value:* = child.text();
				if(value=="false"){
					value = false;
				}else if(value=="true"){
					value = true;
				}else if(value==parseFloat(value).toString()){
					value = parseFloat(value);
				}
				ret.setSetting(child.name(), value);
			}
			return ret;
		}

		private function serialise(group:SettingGroup):XML{
			var ret:XML = new XML("<settings></settings>");
			ret.@title = group.title;
			for each(var settingDef:SettingDefinition in _settingsDefs){
				var value = group.getSetting(settingDef.settingName);
				if(value!=null){
					ret.appendChild(new XML("<"+settingDef.settingName+">"+value+"</"+settingDef.settingName+">"));
				}
			}

			return ret;
		}

		private function setState(state:String):void{
			if(_state==state)return;

			_state = state;
			// dispatch event
		}
		public function setSettingTitle(title:String, loadSettings:Boolean):void{
			_currentSettings.title = title;
			var existing:SettingGroup;
			if(loadSettings && (existing = getSettingGroup(settingTitle))){
				for each(var settingDef:SettingDefinition in _settingsDefs){
					var value:* = existing.getSetting(settingDef.settingName);
					_currentSettings.setSetting(settingDef.settingName, value);
					settingDef.object[settingDef.prop] = value;
				}
				setState(STATE_LOADED);
			}else{
				checkState();
			}
		}

		private function areSame(group1:SettingGroup, group2:SettingGroup):Boolean{
			for each(var settingDef:SettingDefinition in _settingsDefs){
				if(group1.getSetting(settingDef.settingName)!=group2.getSetting(settingDef.settingName))return false;
			}
			return true;
		}

		public function addSetting(object:Object, prop:String, settingName:String, defValue:*):void{
			var setting:SettingDefinition = new SettingDefinition(object, prop, settingName, defValue);
			_settingsDefs.push(setting);
			updateSetting(object, prop);
		}

		public function updateSetting(object:Object, prop:String, doSave:Boolean=false):void{
			var def:SettingDefinition = getSettingDef(object, prop);
			var value:* = object[prop];
			_currentSettings.setSetting(def.settingName, value);
			checkState();

			checkAutoSave();
		}

		public function checkAutoSave():void{
			if(_autoSave && (_state==STATE_UNSAVED || _state==STATE_MODIFIED)){
				save();
			}
		}

		private function checkState():void{
			var existing:SettingGroup = getSettingGroup(settingTitle);
			if(!existing){
				setState(STATE_UNSAVED);
			}else if(areSame(existing, _currentSettings)){
				setState(STATE_LOADED);
			}else{
				setState(STATE_MODIFIED);
			}
		}

		public function save():void{
			if(!settingTitle)return;

			var filePath:String = _settingsFolder+settingTitle+".xml";
			var xml:XML = serialise(_currentSettings);
			var output=(
				'decodeURIComponent("'+encodeURIComponent(filePath)+'"),'+
				'decodeURIComponent("'+encodeURIComponent(xml.toXMLString())+'")'
			);
			MMExecute('FLfile.write('+output+');');

			var existing:SettingGroup = getSettingGroup(settingTitle);
			updateSettingGroup(existing, _currentSettings);

			setState(STATE_LOADED);
		}

		public function updateSettingGroup(update:SettingGroup, withGroup:SettingGroup):void{
			for each(var settingDef in _settingsDefs){
				update.setSetting(settingDef.settingName, withGroup.getSetting(settingDef.settingName));
			}
		}

		public function remove():void{
			var filePath:String = _settingsFolder+settingTitle+".xml";
			MMExecute('FLfile.remove("'+filePath+'")');

			setState(STATE_UNSAVED);
		}

		public function getSettingGroup(title:String):SettingGroup{
			for each(var group in _settingsGroups){
				if(group.title==title)return group;
			}
			return null;
		}

		private function getSettingDef(object:Object, prop:String):SettingDefinition{
			for each(var settingDef in _settingsDefs){
				if(settingDef.object==object && settingDef.prop==prop){
					return settingDef;
				}
			}
			return null;
		}
	}

}

class SettingDefinition{

	public var object:Object;
	public var prop:String;
	public var settingName:String;
	public var defValue:*;

	public function SettingDefinition(object:Object, prop:String, settingName:String, defValue:*){
		this.object = object;
		this.prop = prop;
		this.defValue = defValue;
		this.settingName = settingName;
	}
}