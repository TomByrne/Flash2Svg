package{

	import flash.utils.Dictionary;

	public class SettingGroup{

		public var title:String;

		private var _settings:Dictionary;

		public function SettingGroup(title:String=null){
			this.title = title;

			_settings = new Dictionary();
		}


		public function setSetting(name:String, value:*):void{
			_settings[name] = value;
		}
		public function getSetting(name:String):*{
			return _settings[name];
		}
	}

}