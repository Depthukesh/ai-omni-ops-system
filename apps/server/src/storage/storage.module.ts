import { Global, Module } from "@nestjs/common";
import { OssStorageService } from "./oss-storage.service";

@Global()
@Module({
  providers: [OssStorageService],
  exports: [OssStorageService],
})
export class StorageModule {}
