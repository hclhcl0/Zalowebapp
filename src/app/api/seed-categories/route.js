import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const dynamic = 'force-dynamic';

const DEFAULT_CATEGORIES = [
  {
    name: 'Bảng giá và Tình trạng Vắc xin',
    order: 1,
    description: 'Trung tâm Kiểm soát bệnh tật TP. Đà Nẵng cung cấp đầy đủ các loại vắc xin phòng bệnh cho trẻ em và người lớn theo chương trình tiêm chủng mở rộng quốc gia và tiêm chủng dịch vụ. Tất cả vắc xin được bảo quản đúng chuẩn dây chuyền lạnh, đảm bảo chất lượng và hiệu quả miễn dịch tối ưu.',
  },
  {
    name: 'Gói vắc xin',
    order: 2,
    description: 'CDC Đà Nẵng cung cấp các gói vắc xin trọn gói theo từng độ tuổi và nhu cầu phòng bệnh, giúp khách hàng tiết kiệm chi phí và được tư vấn lịch tiêm khoa học, đầy đủ. Các gói bao gồm vắc xin cho trẻ sơ sinh, trẻ nhỏ, người lớn và phụ nữ chuẩn bị mang thai.',
  },
  {
    name: 'Bảng giá dịch vụ Xét nghiệm, Khám chữa bệnh',
    order: 3,
    description: 'Khoa Xét nghiệm tại CDC Đà Nẵng được trang bị hệ thống máy móc hiện đại, đạt tiêu chuẩn ISO 15189. Các xét nghiệm sinh hóa, huyết học, vi sinh, miễn dịch và sinh học phân tử được thực hiện bởi đội ngũ kỹ thuật viên có chuyên môn cao, cho kết quả chính xác và nhanh chóng.',
  },
  {
    name: 'Bảng giá khám, tư vấn sức khoẻ',
    order: 4,
    description: 'Dịch vụ khám và tư vấn sức khoẻ toàn diện tại CDC Đà Nẵng bao gồm khám tổng quát, tư vấn dinh dưỡng, tư vấn sức khoẻ sinh sản, phòng chống dịch bệnh và chăm sóc sức khoẻ ban đầu. Đội ngũ bác sĩ giàu kinh nghiệm sẽ hỗ trợ người dân chủ động theo dõi và bảo vệ sức khoẻ.',
  },
  {
    name: 'Bảng giá quầy thuốc',
    order: 5,
    description: 'Quầy thuốc tại CDC Đà Nẵng cung cấp các loại thuốc thiết yếu, thuốc phòng chống dịch bệnh và các sản phẩm chăm sóc sức khoẻ đạt tiêu chuẩn của Bộ Y tế. Dược sĩ tư vấn tận tình, hướng dẫn sử dụng thuốc an toàn và hiệu quả cho mọi đối tượng.',
  },
  {
    name: 'Bảng giá khám, tư vấn, điều trị phơi nhiễm HIV',
    order: 6,
    description: 'CDC Đà Nẵng cung cấp dịch vụ tư vấn, xét nghiệm, điều trị dự phòng trước và sau phơi nhiễm HIV (PrEP/PEP) theo đúng phác đồ của Bộ Y tế. Dịch vụ được thực hiện bảo mật hoàn toàn, tôn trọng quyền riêng tư của khách hàng trong môi trường thân thiện, không kỳ thị.',
  },
  {
    name: 'Bảng giá thu phí hoạt động Kiểm dịch Y tế quốc tế',
    order: 7,
    description: 'CDC Đà Nẵng thực hiện các dịch vụ kiểm dịch y tế quốc tế tại cửa khẩu cảng biển và cảng hàng không, bao gồm kiểm tra sức khoẻ người nhập cảnh, cấp chứng nhận sức khoẻ xuất cảnh, kiểm tra y tế phương tiện vận tải và hàng hoá theo quy định của Điều lệ Y tế quốc tế (IHR 2005).',
  },
  {
    name: 'Bảng giá dịch vụ quan trắc môi trường lao động',
    order: 8,
    description: 'Dịch vụ quan trắc môi trường lao động tại CDC Đà Nẵng giúp doanh nghiệp đánh giá và kiểm soát các yếu tố có hại tại nơi làm việc như vi khí hậu, bụi, tiếng ồn, ánh sáng, hơi khí độc và các yếu tố vật lý khác. Kết quả quan trắc là cơ sở pháp lý để doanh nghiệp thực hiện các biện pháp cải thiện điều kiện lao động.',
  },
  {
    name: 'Bảng giá khám bệnh nghề nghiệp',
    order: 9,
    description: 'Khoa Bệnh nghề nghiệp tại CDC Đà Nẵng thực hiện khám phát hiện sớm, chẩn đoán và giám định các bệnh do điều kiện lao động gây ra như bụi phổi, nhiễm độc nghề nghiệp, điếc nghề nghiệp, bệnh rung chuyển, viêm da tiếp xúc... Đây là quyền lợi bắt buộc của người lao động được pháp luật bảo vệ.',
  },
  {
    name: 'Bảng giá dịch vụ xét nghiệm mẫu nước',
    order: 10,
    description: 'CDC Đà Nẵng cung cấp dịch vụ lấy mẫu và phân tích chất lượng nước ăn uống, nước sinh hoạt, nước thải và nước môi trường theo QCVN của Bộ Y tế và Bộ Tài nguyên - Môi trường. Phòng xét nghiệm đạt tiêu chuẩn, kết quả có giá trị pháp lý phục vụ quản lý nhà nước và doanh nghiệp.',
  },
];

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let created = 0;
  let skipped = 0;
  const results = [];

  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await prisma.serviceCategory.findFirst({
      where: { name: cat.name },
    });

    if (existing) {
      // Cập nhật description dù đã tồn tại
      await prisma.serviceCategory.update({
        where: { id: existing.id },
        data: { description: cat.description, order: cat.order },
      });
      results.push({ name: cat.name, status: 'updated' });
      skipped++;
    } else {
      await prisma.serviceCategory.create({
        data: { name: cat.name, order: cat.order, description: cat.description, isActive: true },
      });
      results.push({ name: cat.name, status: 'created' });
      created++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Tạo mới: ${created}, Bỏ qua (đã tồn tại): ${skipped}`,
    created,
    skipped,
    results,
  });
}
