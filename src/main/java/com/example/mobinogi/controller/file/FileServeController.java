package com.example.mobinogi.controller.file;

import com.example.mobinogi.service.file.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * File download/serve controller.
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Slf4j
public class FileServeController{

	/** File storage service. */
	private final FileStorageService fileStorageService;

	/** MIME-type mapping by file extension. */
	private static final Map<String, MediaType> MEDIA_TYPES = Map.of(
		"jpg", MediaType.IMAGE_JPEG,
		"jpeg", MediaType.IMAGE_JPEG,
		"png", MediaType.IMAGE_PNG,
		"gif", MediaType.IMAGE_GIF,
		"webp", MediaType.parseMediaType("image/webp")
	);

	/**
	 * Serves file bytes by `{subDir}/{filename}` path.
	 *
	 * @param subDir file sub-directory
	 * @param filename file name
	 * @return file byte response
	 */
	@GetMapping("/{subDir}/{filename}")
	public ResponseEntity<byte[]> serveFile(
		@PathVariable String subDir,
		@PathVariable String filename
	){
		try{
			byte[] data = fileStorageService.readFile(subDir, filename);

			String ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
			MediaType mediaType = MEDIA_TYPES.getOrDefault(ext, MediaType.APPLICATION_OCTET_STREAM);

			return ResponseEntity.ok()
				.contentType(mediaType)
				.cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS))
				.body(data);
		}catch(Exception e){
			log.error("File read failed: {}/{}", subDir, filename, e);
			return ResponseEntity.notFound().build();
		}
	}
}
