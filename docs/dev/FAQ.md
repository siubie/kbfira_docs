# FAQ

- Q. 既存のアプリ（例えば管理者ツール）を改良しようと思い，そのアプリに対応する    ディレクトリ（例えばadmin）を（例えばadmin_copyという名前で）複製したのですが，ブラウザで
  
  ```
  http://localhost:8081/kbfira_docs/index.php/admin_copy/
  ```
  
  などにアクセスしても
  
  ```
  {“coreStatus”:false,“coreError”:“Invalid app controller or controller not found: HomeController.“}
  ```
  
  のようなエラーが出ます．どうしたらいいですか？
  
  - A. Ubuntu Serverにログインしているユーザが所有者になっていなかったり，複製したディレクトリのアクセス権がなかったりしている可能性があります．
    
    ひとまず，システムのソースコードが置かれているフォルダで
    
    ```
    ll
    ```
    
    コマンド（厳密には，ls -lのエイリアス）を実行してみてください．
    
    admin_copyディレクトリの部分の結果が
    
    ```
    drwx------  9   501 dialout  288 Jul 16 06:04 admin_copy/
    ```
    
    のようになっている場合は，まずchownコマンドでディレクトリの所有者を変更しましょう（以下は，ユーザ名が"kodai"である場合の例）：
    
    ```
    sudo chown kodai:kodai admin_copy
    ```
    
    chownコマンドを実行したら，再度
    
    ```
    ll
    ```
    
    コマンドを実行し，ディレクトリの所有者が変わっていることを確認します：
    
    ```
    drwx------  9 kodai kodai    288 Jul 18 05:09 admin_copy/
    ```
    
    確認できたら，次はchmodコマンドでアクセス権を付与していきます（Rオプションを付与することで，ディレクトリ内の全てのファイルのアクセス権を変更）：
    
    ```
    sudo chmod 775 -R admin_copy
    ```
    
    再度
    
    ```
    ll
    ```
    
    コマンドを実行し，
    
    ```
    drwxrwxr-x  9 kodai kodai    288 Jul 18 05:09 admin_copy/
    ```
    
    のようにアクセス権が変更されていることを確認しましょう．念のため，"drwx..."となっている部分や"kodai kodai"となっている部分がコピー元のディレクトリ（この場合はadmin）と揃っていることも確認しておいてください（ちなみに，llコマンドの実行結果の意味は[【Linux】llコマンド(ls -lコマンド)の表示の見方:めもめも](http://ilovelovemoney.blog.fc2.com/blog-entry-112.html)などに書いてあります）．
    
    以上の作業が終わったら，再度
    
    ```
    http://localhost:8081/kbfira_docs/index.php/admin_copy/
    ```
    
    にアクセスしてみてください．問題が解決していることを祈っています．

- Q. 開発したアプリケーションをサーバにデプロイするには，どうしたらいいですか？
  
  - A. （研究室内部向け）ひとまず，先輩の[引き継ぎ資料](https://hiroshimauniv.sharepoint.com/:w:/s/msteams_451b22-teams/Ef7jNV8yhzZInxgkspDEWS4Bj5nNdRhCjXPlpZnQN1thlg?e=5wj25g)を参照してください．補足等が必要になれば，別途，追記するようにします．