export class UploadService {
  buildLogoUrl(request: { protocol: string; host: string }, filename: string) {
    return `${request.protocol}://${request.host}/uploads/${filename}`;
  }
}

export const uploadService = new UploadService();