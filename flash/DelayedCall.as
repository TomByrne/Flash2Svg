package{

	import flash.utils.*;


	public class DelayedCall{

		private static var _idMap:Dictionary;
		{
			_idMap = new Dictionary();
		}
		
		public static function call(func:Function, delay:Number){
			clear(func);
			var id = setTimeout(func, delay*1000);
			_idMap[func] = id;
		}
		public static function clear(func:Function){
			var id:* = _idMap[func];
			if(id!=null){
				clearTimeout(id);
			}
		}
	}

}