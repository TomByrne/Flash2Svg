package{

	import flash.utils.Dictionary;

	public class SettingGroup{

		public var title:String;
		public var userCreated:Boolean;

		private var _settings:Dictionary;

		public function SettingGroup(title:String=null, userCreated:Boolean=false){
			this.title = title;
			this.userCreated = userCreated;

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