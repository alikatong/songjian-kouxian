INSERT INTO events (code, title, body, area_code, min_realm_order, max_realm_order, weight, choices) VALUES
  ('luoxia_last_lantern', '落霞·最后一盏灯',
   '天刚擦黑，渡口的灯却被吹灭了。隔着涨水的溪流，有人敲了三下竹梆。守渡的阿婆正摸索火折子，手边还搁着一篮没来得及收的药草。',
   'luoxia', 0, 0, 85,
   '[{"text":"接过火折子，替她点灯","result":"灯亮了，溪对岸也回亮了一盏。阿婆把篮里的药草分你一把，说这下夜归的人看得清路了。","effects":{"items":{"mat_mortal_1":3}}},{"text":"学那三声梆响，替她回信","result":"对岸回敲了两声。原来是阿婆的儿子平安到了家，她笑着把今夜的渡钱塞进你手里。","effects":{"spirit_stones":5}}]'),
  ('qingyun_wind_kite', '青云·纸鸢引路',
   '一只燕形纸鸢倒挂在山崖的老松上。放鸢的孩子说，尾巴上绑了给山上师父的回信。风再转一次，细线就会磨断。',
   'qingyun_foothill', 1, 4, 85,
   '[{"text":"伏在岩脊上，挑回纸鸢","result":"你护住了信。孩子拆下尾巴上的红线道谢，又领你去摘他发现的一丛铜皮灵叶。","effects":{"items":{"mat_lianpi_1":3}}},{"text":"顺风托它一程","result":"纸鸢挣脱树梢，落进半山药寮。师父读了信，请你喝茶，又用竹筒分了你几滴铜皮清露。","effects":{"items":{"mat_lianpi_2":3}}}]'),
  ('blackstone_echo_bell', '黑石·空谷铜铃',
   '石林深处响起一声铃，山壁回了两声。你循声找到一条绷紧的旧绳，绳的一头拴着铜铃，另一头消失在滚石下。',
   'blackstone_forest', 5, 8, 85,
   '[{"text":"搬开滚石，沿绳找人","result":"绳下拴的是一柄旧矿锤。你把它留给后来人，只带走锤边几片铁骨灵叶。","effects":{"items":{"mat_lianggu_1":3}}},{"text":"摇铃两下，静听回音","result":"唯有北面没有回声。你绕过去找到一处开口，洞口积着一捧沉甸甸的铁骨玄砂。","effects":{"items":{"mat_lianggu_3":3}}}]');
