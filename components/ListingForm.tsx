"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient, CITIES } from "@/lib/supabase";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

interface ListingFormData {
  title: string;
  description: string;
  price: string;
  city: string;
  address: string;
  rooms: string;
  area_m2: string;
  type: "shitje" | "qira";
}

const initialFormData: ListingFormData = {
  title: "",
  description: "",
  price: "",
  city: "",
  address: "",
  rooms: "1",
  area_m2: "",
  type: "shitje",
};

export function ListingForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<ListingFormData>(initialFormData);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string | null) => {
    setFormData((prev) => ({ ...prev, [name]: value ?? "" }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 10) {
      toast.error("Maksimumi 10 foto lejohen.");
      return;
    }
    setImages((prev) => [...prev, ...files]);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.price || !formData.city || !formData.address) {
      toast.error("Ju lutemi plotësoni të gjitha fushat e detyrueshme.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    try {
      // Check auth
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Duhet të jeni të regjistruar për të postuar banesë.");
        router.push("/login");
        return;
      }

      // Check phone verified
      const { data: profile } = await supabase
        .from("profiles")
        .select("phone_verified")
        .eq("id", user.id)
        .single();

      if (!profile?.phone_verified) {
        toast.error("Duhet të verifikoni numrin e telefonit para se të postoni.");
        return;
      }

      // Upload images
      const imageUrls: string[] = [];
      for (const image of images) {
        const fileName = `${user.id}/${Date.now()}-${image.name}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("listing-images").getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }

      // Insert listing
      const { error: insertError } = await supabase.from("listings").insert({
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        city: formData.city,
        address: formData.address,
        rooms: parseInt(formData.rooms),
        area_m2: parseFloat(formData.area_m2),
        type: formData.type,
        images: imageUrls,
      });

      if (insertError) throw insertError;

      toast.success("Banesa u postua me sukses!");
      router.push("/listings");
      router.refresh();
    } catch (error) {
      console.error("Error posting listing:", error);
      toast.error("Ndodhi një gabim. Ju lutemi provoni përsëri.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Posto banesë të re</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titulli *</Label>
            <Input
              id="title"
              name="title"
              placeholder="p.sh. Apartament 3 dhomash në qendër"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          {/* Type + Price row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Lloji *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => handleSelectChange("type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjidh llojin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shitje">Shitje</SelectItem>
                  <SelectItem value="qira">Qira</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">
                Çmimi (€) {formData.type === "qira" ? "/muaj" : ""} *
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                placeholder="50000"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Përshkrimi *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Përshkruani banesën..."
              rows={4}
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          {/* City + Address row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">Qyteti *</Label>
              <Select
                value={formData.city}
                onValueChange={(v) => handleSelectChange("city", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Zgjidh qytetin" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adresa *</Label>
              <Input
                id="address"
                name="address"
                placeholder="p.sh. Rr. Lidhja e Prizrenit 123"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Rooms + Area row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rooms">Numri i dhomave</Label>
              <Select
                value={formData.rooms}
                onValueChange={(v) => handleSelectChange("rooms", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Numri i dhomave" />
                </SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5+"].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n} {n === "5+" ? "" : "dhoma"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="area_m2">Sipërfaqja (m²) *</Label>
              <Input
                id="area_m2"
                name="area_m2"
                type="number"
                placeholder="75"
                value={formData.area_m2}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>Fotot (max 10)</Label>
            <div className="flex flex-wrap gap-3">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative h-24 w-24 overflow-hidden rounded-lg">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-[#1B4FFF] hover:text-[#1B4FFF]">
                <Upload className="h-6 w-6" />
                <span className="mt-1 text-xs">Ngarko</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#1B4FFF] hover:bg-[#1438c4] sm:w-auto"
          >
            {isSubmitting ? "Duke postuar..." : "Posto banesën"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
